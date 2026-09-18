import { SEASON_WEEKS } from "./season";
import { WEEKLY_GOAL } from "./week";
import type { WeekStat } from "./seasonStats";

export type ParticipantSettlement = {
  /** Certifications counted toward refund — capped per week at WEEKLY_GOAL. */
  refundableCount: number;
  refund: number;
  /** Succeeded every week of the season. */
  isCompleted: boolean;
};

/** Per-week-capped refund: a week that overshoots WEEKLY_GOAL still only refunds WEEKLY_GOAL certifications. */
export function computeParticipantSettlement(
  weeks: WeekStat[],
  entryFee: number,
  refundPerCertification: number,
): ParticipantSettlement {
  const refundableCount = weeks.reduce(
    (sum, week) => sum + Math.min(week.achieved, WEEKLY_GOAL),
    0,
  );
  const refund = Math.min(refundableCount * refundPerCertification, entryFee);
  const isCompleted = weeks.length === SEASON_WEEKS && weeks.every((week) => week.isSuccess);
  return { refundableCount, refund, isCompleted };
}

/**
 * Prize pool is what non-완주자 leave on the table (entryFee - their refund),
 * split evenly among 완주자. A completer's own leftover is always 0, so
 * summing over every participant (not just non-completers) gives the same
 * total and avoids filtering twice.
 */
export function computePrizeShare(
  settlements: ParticipantSettlement[],
  entryFee: number,
): number {
  const completedCount = settlements.filter((s) => s.isCompleted).length;
  if (completedCount === 0) return 0;

  const pool = settlements.reduce((sum, s) => sum + (entryFee - s.refund), 0);
  return Math.floor(pool / completedCount);
}
