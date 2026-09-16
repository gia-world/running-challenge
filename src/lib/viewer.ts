import { cache } from "react";
import { createClient } from "./supabase/server";
import { todayInSeoul } from "./week";
import type { UserRole } from "./types";

export type ActiveSeason = {
  id: string;
  team_id: string;
  start_date: string;
  end_date: string;
};

export type ViewerContext = {
  teamId: string | null;
  teamRole: UserRole | null;
  activeSeason: ActiveSeason | null;
  isSeasonMember: boolean;
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
    .select("team_id, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) {
    return { teamId: null, teamRole: null, activeSeason: null, isSeasonMember: false };
  }

  const today = todayInSeoul();
  const { data: season } = await supabase
    .from("seasons")
    .select("id, team_id, start_date, end_date")
    .eq("team_id", membership.team_id)
    .lte("start_date", today)
    .gte("end_date", today)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  let isSeasonMember = false;
  if (season) {
    const { data: seasonMembership } = await supabase
      .from("season_memberships")
      .select("id")
      .eq("season_id", season.id)
      .eq("user_id", userId)
      .maybeSingle();
    isSeasonMember = !!seasonMembership;
  }

  return {
    teamId: membership.team_id,
    teamRole: membership.role,
    activeSeason: season ?? null,
    isSeasonMember,
  };
});
