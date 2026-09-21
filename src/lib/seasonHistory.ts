import type { SupabaseClient } from "@supabase/supabase-js";
import { computeSeasonWeeklyStats, emptyWeekStats } from "./seasonStats";
import { seasonWeekCount } from "./season";

export type SeasonHistoryEntry = {
  id: string;
  start_date: string;
  end_date: string;
  participantCount: number;
  completedCount: number;
  viewerParticipated: boolean;
  viewerCompleted: boolean;
};

export type TeamSeasonHistory = {
  seasons: SeasonHistoryEntry[];
  completedCountByUserId: Map<string, number>;
  participatedUserIds: Set<string>;
};

/**
 * Every CONCLUDED season a team has run, each with team-wide participant/완주
 * counts plus this viewer's own record — and, across all of it, a lifetime
 * completed-season tally per user (what the season success badge is based
 * on). The currently active season is deliberately excluded — badges and
 * history are a record of seasons that have already ended, not a live
 * projection of the one still in progress. Runs one query pair per season,
 * so it scales with how many seasons a team has ever run, not with team size.
 */
export async function computeTeamSeasonHistory(
  supabase: SupabaseClient,
  teamId: string,
  viewerId: string,
  excludeSeasonId: string | null,
): Promise<TeamSeasonHistory> {
  let query = supabase
    .from("seasons")
    .select("id, start_date, end_date")
    .eq("team_id", teamId)
    .order("start_date", { ascending: false });
  if (excludeSeasonId) {
    query = query.neq("id", excludeSeasonId);
  }
  const { data: seasonsRaw } = await query;

  const completedCountByUserId = new Map<string, number>();
  const participatedUserIds = new Set<string>();

  const seasons = await Promise.all(
    (seasonsRaw ?? []).map(async (season) => {
      const [{ data: seasonMemberships }, weeklyStats] = await Promise.all([
        supabase.from("season_memberships").select("user_id").eq("season_id", season.id),
        computeSeasonWeeklyStats(supabase, season.id, season.start_date, season.end_date),
      ]);
      const weekCount = seasonWeekCount(season.start_date, season.end_date);

      const participantIds = (seasonMemberships ?? []).map((m) => m.user_id);
      let completedCount = 0;
      let viewerCompleted = false;

      for (const userId of participantIds) {
        participatedUserIds.add(userId);
        const weeks = weeklyStats.get(userId) ?? emptyWeekStats(weekCount);
        const completed = weeks.every((w) => w.isSuccess);
        if (completed) {
          completedCount += 1;
          completedCountByUserId.set(userId, (completedCountByUserId.get(userId) ?? 0) + 1);
          if (userId === viewerId) viewerCompleted = true;
        }
      }

      return {
        id: season.id,
        start_date: season.start_date,
        end_date: season.end_date,
        participantCount: participantIds.length,
        completedCount,
        viewerParticipated: participantIds.includes(viewerId),
        viewerCompleted,
      };
    }),
  );

  return { seasons, completedCountByUserId, participatedUserIds };
}
