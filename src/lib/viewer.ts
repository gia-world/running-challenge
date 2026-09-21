import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient, getAuthUser } from "./supabase/server";
import { isBeforeNoonInSeoul, todayInSeoul, yesterdayInSeoul } from "./week";
import type { UserRole } from "./types";

export type ActiveSeason = {
  id: string;
  team_id: string;
  start_date: string;
  end_date: string;
};

export type ViewerContext = {
  teamId: string | null;
  teamName: string | null;
  teamRole: UserRole | null;
  activeSeason: ActiveSeason | null;
  isSeasonMember: boolean;
  /**
   * Set only when a just-ended season's grace window is still open AND a
   * different, newer season has already started — the "back-to-back
   * seasons" overlap. `activeSeason` above always wins that case (it picks
   * whichever season started most recently), so this is the one place a
   * caller can still reach the older season to let the viewer choose which
   * one to certify into. Never equal to activeSeason.id.
   */
  graceSeason: ActiveSeason | null;
  isGraceSeasonMember: boolean;
};

/**
 * Resolves a signed-in user's team membership, today's active season for
 * that team (if any), and whether they're a participant in it. Centralized
 * here since home/feed/certify/admin all need this same context. Wrapped in
 * cache() so admin's nested layout+page (both of which need this) share one
 * set of queries per request instead of running it twice.
 */
export const loadViewerContext = cache(async (userId: string): Promise<ViewerContext> => {
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("team_memberships")
    .select("team_id, role, teams(name)")
    .eq("user_id", userId)
    .maybeSingle<{ team_id: string; role: UserRole; teams: { name: string } | null }>();

  if (!membership) {
    return {
      teamId: null,
      teamName: null,
      teamRole: null,
      activeSeason: null,
      isSeasonMember: false,
      graceSeason: null,
      isGraceSeasonMember: false,
    };
  }

  const today = todayInSeoul();
  // Grace period: a season that ended yesterday still counts as active
  // until noon KST, mirroring the real crew's "종료 다음날 정오까지 인정"
  // buffer so certification doesn't go dead the instant a season closes.
  // Ordering by start_date picks whichever season started most recently,
  // so if a new season has already begun back-to-back with the old one's
  // grace window still open, this query returns the NEW one — the old
  // one is recovered separately below.
  const seasonLookupFloor = isBeforeNoonInSeoul() ? yesterdayInSeoul() : today;
  const { data: season } = await supabase
    .from("seasons")
    .select("id, team_id, start_date, end_date")
    .eq("team_id", membership.team_id)
    .lte("start_date", today)
    .gte("end_date", seasonLookupFloor)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // A season whose grace window is open right now, independent of which
  // season the query above landed on. Only meaningful (and only ever
  // different from `season`) when a new season already started during
  // the previous one's grace period.
  let graceSeason: ActiveSeason | null = null;
  if (isBeforeNoonInSeoul()) {
    const yesterday = yesterdayInSeoul();
    const { data: gracing } = await supabase
      .from("seasons")
      .select("id, team_id, start_date, end_date")
      .eq("team_id", membership.team_id)
      .eq("end_date", yesterday)
      .maybeSingle();
    if (gracing && gracing.id !== season?.id) {
      graceSeason = gracing;
    }
  }

  const [isSeasonMember, isGraceSeasonMember] = await Promise.all([
    isMemberOfSeason(supabase, season?.id ?? null, userId),
    isMemberOfSeason(supabase, graceSeason?.id ?? null, userId),
  ]);

  return {
    teamId: membership.team_id,
    teamName: membership.teams?.name ?? null,
    teamRole: membership.role,
    activeSeason: season ?? null,
    isSeasonMember,
    graceSeason,
    isGraceSeasonMember,
  };
});

async function isMemberOfSeason(
  supabase: Awaited<ReturnType<typeof createClient>>,
  seasonId: string | null,
  userId: string,
): Promise<boolean> {
  if (!seasonId) return false;
  const { data } = await supabase
    .from("season_memberships")
    .select("id")
    .eq("season_id", seasonId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

/**
 * Common guard for every team-scoped page: require a signed-in user who
 * has joined a team, redirecting to /login or /join otherwise. This exact
 * getAuthUser + loadViewerContext + redirect sequence was duplicated
 * across home/certify/feed/status/history/admin — centralized here so
 * there's one place to change if the gating logic ever needs to.
 */
export async function requireTeamViewer() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const viewer = await loadViewerContext(user.id);

  if (!viewer.teamId) {
    redirect("/join");
  }

  // Narrowed for callers that need teamId as a plain string (e.g. passing
  // it to a child component prop) — redirect() above guarantees this at
  // runtime, TS just can't see through the extracted function boundary.
  return { user, viewer: viewer as ViewerContext & { teamId: string } };
}
