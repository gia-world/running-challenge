import type { SupabaseClient } from "@supabase/supabase-js";
import { seasonWeekIndexForDate, seasonWeekCount } from "./season";
import { WEEKLY_GOAL } from "./week";

export type WeekStat = { achieved: number; isSuccess: boolean };

/** Per-week distinct-day achievement, for every participant with an approved activity in the season. */
export async function computeSeasonWeeklyStats(
  supabase: SupabaseClient,
  seasonId: string,
  seasonStartDate: string,
  seasonEndDate: string,
): Promise<Map<string, WeekStat[]>> {
  const weekCount = seasonWeekCount(seasonStartDate, seasonEndDate);
  const { data: activities } = await supabase
    .from("activities")
    .select("user_id, activity_date")
    .eq("season_id", seasonId)
    .eq("status", "approved");

  const datesByUserWeek = new Map<string, Set<string>[]>();
  for (const activity of activities ?? []) {
    const weekIndex = seasonWeekIndexForDate(seasonStartDate, activity.activity_date);
    if (weekIndex === null || weekIndex >= weekCount) continue;
    if (!datesByUserWeek.has(activity.user_id)) {
      datesByUserWeek.set(
        activity.user_id,
        Array.from({ length: weekCount }, () => new Set<string>()),
      );
    }
    datesByUserWeek.get(activity.user_id)![weekIndex].add(activity.activity_date);
  }

  const result = new Map<string, WeekStat[]>();
  for (const [userId, weeks] of datesByUserWeek) {
    result.set(
      userId,
      weeks.map((dates) => ({ achieved: dates.size, isSuccess: dates.size >= WEEKLY_GOAL })),
    );
  }
  return result;
}

export function emptyWeekStats(weekCount: number): WeekStat[] {
  return Array.from({ length: weekCount }, () => ({ achieved: 0, isSuccess: false }));
}
