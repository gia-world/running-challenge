const TIME_ZONE = "Asia/Seoul";
export const WEEKLY_GOAL = 3;

/** Today's date in Asia/Seoul as YYYY-MM-DD, regardless of server locale. */
export function todayInSeoul(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(
    new Date(),
  );
}

/**
 * Current week's [start, end] as YYYY-MM-DD (both inclusive), week starting Monday,
 * computed in Asia/Seoul local time per the crew's certification rules.
 */
export function currentWeekRangeInSeoul(): { start: string; end: string } {
  const today = todayInSeoul();
  const [y, m, d] = today.split("-").map(Number);
  // Treat the date as a UTC-midnight instant purely to do day-of-week arithmetic.
  const asUtc = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = asUtc.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(asUtc);
  monday.setUTCDate(asUtc.getUTCDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const toISODate = (date: Date) => date.toISOString().slice(0, 10);
  return { start: toISODate(monday), end: toISODate(sunday) };
}
