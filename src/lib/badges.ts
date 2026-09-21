export type Badge = { emoji: string; label: string; criteria: string };

// Ascending order — the case a member's badge row is built from.
export const BADGE_CATALOG: Badge[] = [
  { emoji: "🌱", label: "최초 참여", criteria: "시즌에 처음 참여하면 획득" },
  { emoji: "🎖️", label: "1개 기수 완주", criteria: "시즌을 1회 완주하면 획득" },
  { emoji: "🏆", label: "5개 기수 완주", criteria: "시즌을 5회 완주하면 획득" },
  { emoji: "🐲", label: "25개 기수 완주", criteria: "시즌을 25회 완주하면 획득" },
];

/** Every tier a member has earned so far, lowest to highest — a badge case, not just the top one. */
export function earnedBadges(completedSeasonCount: number, hasParticipated: boolean): Badge[] {
  const earned: Badge[] = [];
  if (hasParticipated) earned.push(BADGE_CATALOG[0]);
  if (completedSeasonCount >= 1) earned.push(BADGE_CATALOG[1]);
  if (completedSeasonCount >= 5) earned.push(BADGE_CATALOG[2]);
  if (completedSeasonCount >= 25) earned.push(BADGE_CATALOG[3]);
  return earned;
}
