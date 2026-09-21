export const SEASON_WEEKS = 4;
export const SEASON_LENGTH_DAYS = SEASON_WEEKS * 7;

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Default season end date: 4 full weeks (28 days) from start, inclusive. */
export function defaultSeasonEndDate(startDate: string): string {
  const start = parseISODate(startDate);
  start.setUTCDate(start.getUTCDate() + SEASON_LENGTH_DAYS - 1);
  return toISODate(start);
}

/** [start, end] (both inclusive) for the given 0-indexed week of a season. */
export function seasonWeekRange(
  seasonStartDate: string,
  weekIndex: number,
): { start: string; end: string } {
  const start = parseISODate(seasonStartDate);
  start.setUTCDate(start.getUTCDate() + weekIndex * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start: toISODate(start), end: toISODate(end) };
}

/**
 * Caps "today" at the season's own end date. During the grace period, the
 * real calendar date is already one day past end_date — feeding that raw
 * date into seasonWeekIndexForDate would compute a week beyond the season's
 * actual length whenever the season is shorter than the full 4-week grid
 * (SEASON_LENGTH_DAYS doesn't know the season was cut short). Anything
 * treating "today" as "the season week to show as current" should go
 * through this first.
 */
export function cappedTodayForSeason(seasonEndDate: string, today: string): string {
  return seasonEndDate < today ? seasonEndDate : today;
}

/** Which 0-indexed week of the season a date falls in, or null if outside the season. */
export function seasonWeekIndexForDate(
  seasonStartDate: string,
  dateISO: string,
): number | null {
  const start = parseISODate(seasonStartDate);
  const date = parseISODate(dateISO);
  const diffDays = Math.round((date.getTime() - start.getTime()) / 86_400_000);
  if (diffDays < 0 || diffDays >= SEASON_LENGTH_DAYS) return null;
  return Math.floor(diffDays / 7);
}

/**
 * Labels a date as the Nth certification of its season week, among a
 * user's other approved certification dates (for display, e.g. feed
 * captions like "2주차 1회째"). `approvedDates` need not be sorted or
 * deduped and should include `targetDate` itself.
 */
export function describeSeasonOccurrence(
  seasonStartDate: string,
  approvedDates: string[],
  targetDate: string,
): { weekIndex: number; ordinal: number } | null {
  const weekIndex = seasonWeekIndexForDate(seasonStartDate, targetDate);
  if (weekIndex === null) return null;

  const distinctDatesInWeek = Array.from(
    new Set(
      approvedDates.filter((date) => seasonWeekIndexForDate(seasonStartDate, date) === weekIndex),
    ),
  ).sort();

  return { weekIndex, ordinal: distinctDatesInWeek.indexOf(targetDate) + 1 };
}
