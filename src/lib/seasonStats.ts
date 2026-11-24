import type { SupabaseClient } from "@supabase/supabase-js";
import { seasonWeekIndexForDate, seasonWeekCount } from "./season";
import { WEEKLY_GOAL } from "./week";

export type WeekStat = { achieved: number; isSuccess: boolean };
export type MemberSeasonStats = { weeks: WeekStat[]; totalDistanceKm: number };

/**
 * Per-week distinct-day achievement + 시즌 전체 누적 거리, for every
 * participant with an approved activity in the season. 거리는 주간
 * 환급 상한(3회)과 무관하게 실제로 인증한 전체 거리를 그대로 더한다 —
 * `achieved`(주차별 인증 횟수)도 상한 없이 그대로 보여주는 것과 같은
 * 기준.
 */
export async function computeSeasonWeeklyStats(
  supabase: SupabaseClient,
  seasonId: string,
  seasonStartDate: string,
  seasonEndDate: string,
): Promise<Map<string, MemberSeasonStats>> {
  const weekCount = seasonWeekCount(seasonStartDate, seasonEndDate);
  const { data: activities } = await supabase
    .from("activities")
    .select("user_id, activity_date, distance_km")
    .eq("season_id", seasonId)
    .eq("status", "approved");

  const datesByUserWeek = new Map<string, Set<string>[]>();
  const distanceByUser = new Map<string, number>();
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
    distanceByUser.set(
      activity.user_id,
      (distanceByUser.get(activity.user_id) ?? 0) + Number(activity.distance_km),
    );
  }

  const result = new Map<string, MemberSeasonStats>();
  for (const [userId, weeks] of datesByUserWeek) {
    result.set(userId, {
      weeks: weeks.map((dates) => ({ achieved: dates.size, isSuccess: dates.size >= WEEKLY_GOAL })),
      totalDistanceKm: distanceByUser.get(userId) ?? 0,
    });
  }
  return result;
}

export function emptyWeekStats(weekCount: number): WeekStat[] {
  return Array.from({ length: weekCount }, () => ({ achieved: 0, isSuccess: false }));
}

export function emptyMemberSeasonStats(weekCount: number): MemberSeasonStats {
  return { weeks: emptyWeekStats(weekCount), totalDistanceKm: 0 };
}
