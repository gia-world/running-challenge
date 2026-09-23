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
  const isCompleted = weeks.every((week) => week.isSuccess);
  return { refundableCount, refund, isCompleted };
}

/** How many certifications a full completer (every week at WEEKLY_GOAL) racks up across a season of this length. */
export function maxRefundableCertifications(weekCount: number): number {
  return WEEKLY_GOAL * weekCount;
}

/**
 * Suggests the sibling of whichever fee field an admin just typed into, so
 * a full completer's refund comes out to exactly the entry fee (the
 * relationship the app's own defaults already follow: 24,000원 참가비 ÷
 * 2,000원 단가 = 12회, a 4주 시즌의 3회×4주). Rounded to each field's own
 * input step so the suggestion stays a clean number — not meant to be
 * exact, just a starting point the admin can still overwrite (e.g. to
 * build in a base amount that's never refunded on top of the per-cert rate).
 */
export function deriveRefundPerCertification(entryFee: number, weekCount: number): number {
  const maxCerts = maxRefundableCertifications(weekCount);
  if (maxCerts <= 0) return 0;
  return Math.round(entryFee / maxCerts / 500) * 500;
}

export function deriveEntryFee(refundPerCertification: number, weekCount: number): number {
  return Math.round((refundPerCertification * maxRefundableCertifications(weekCount)) / 1000) * 1000;
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
