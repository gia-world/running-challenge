const TIME_ZONE = "Asia/Seoul";
export const DAYS_PER_WEEK = 7;
export const WEEKLY_GOAL = 3;

/** Today's date in Asia/Seoul as YYYY-MM-DD, regardless of server locale. */
export function todayInSeoul(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(
    new Date(),
  );
}

/** Yesterday's date in Asia/Seoul as YYYY-MM-DD. */
export function yesterdayInSeoul(): string {
  const [y, m, d] = todayInSeoul().split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Whether it's currently before noon in Asia/Seoul — used for the grace
 * period that keeps a just-ended season certifiable into the morning after
 * it closes, matching the real-world crew's own "종료 다음날 정오까지" buffer.
 */
export function isBeforeNoonInSeoul(): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  );
  return hour < 12;
}

/**
 * Whether a season is still within its certification grace window — today
 * is on or before the season's end date, or it's the very next day and
 * still before noon KST. Mirrors the grace check loadViewerContext already
 * does for certification itself, reused here to gate deleting an activity:
 * once certification for a season closes, undoing one shouldn't be
 * possible either.
 */
export function isWithinCertificationGrace(seasonEndDate: string): boolean {
  const today = todayInSeoul();
  if (today <= seasonEndDate) return true;
  return seasonEndDate === yesterdayInSeoul() && isBeforeNoonInSeoul();
}
