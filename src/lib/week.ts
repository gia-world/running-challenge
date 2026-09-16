const TIME_ZONE = "Asia/Seoul";
export const WEEKLY_GOAL = 3;

/** Today's date in Asia/Seoul as YYYY-MM-DD, regardless of server locale. */
export function todayInSeoul(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(
    new Date(),
  );
}
