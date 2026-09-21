export type Badge = { emoji: string; label: string; criteria: string };

// Ascending order — the case a member's badge row is built from.
export const BADGE_CATALOG: Badge[] = [
  { emoji: "🌱", label: "최초 참여", criteria: "시즌에 처음 참여하면 획득 (최대 1개)" },
  { emoji: "🎖️", label: "완주 메달", criteria: "완주한 시즌마다 1개씩 획득 — 5개 모이면 🏆로 교환" },
  { emoji: "🏆", label: "5기수 트로피", criteria: "메달 5개를 모으면 1개 획득 — 5개 모이면 🐲로 교환" },
  { emoji: "🐲", label: "25기수 드래곤", criteria: "트로피 5개(25개 기수 완주)를 모으면 획득" },
];

/**
 * Every badge a member currently holds, lowest tier first — same-tier
 * badges stack (4 completed seasons = four medals) until five of a tier
 * convert into one of the next (a fifth medal becomes a trophy instead of
 * a fifth medal, mirroring a real medal case). Only seasons that have
 * actually concluded count — `completedSeasonCount` must exclude the
 * currently active season, since badges are awarded once a season ends.
 */
export function earnedBadges(completedSeasonCount: number, hasParticipated: boolean): Badge[] {
  const earned: Badge[] = [];
  if (hasParticipated) earned.push(BADGE_CATALOG[0]);

  const dragons = Math.floor(completedSeasonCount / 25);
  const afterDragons = completedSeasonCount % 25;
  const trophies = Math.floor(afterDragons / 5);
  const medals = afterDragons % 5;

  for (let i = 0; i < medals; i++) earned.push(BADGE_CATALOG[1]);
  for (let i = 0; i < trophies; i++) earned.push(BADGE_CATALOG[2]);
  for (let i = 0; i < dragons; i++) earned.push(BADGE_CATALOG[3]);

  return earned;
}
