export type Badge = { emoji: string; label: string };

// Highest tier first — the first threshold met wins.
const TIERS: { threshold: number; emoji: string; label: string }[] = [
  { threshold: 25, emoji: "🐲", label: "25개 기수 완주" },
  { threshold: 5, emoji: "🏆", label: "5개 기수 완주" },
  { threshold: 1, emoji: "🎖️", label: "1개 기수 완주" },
];

/** null means never even participated once — no badge yet. */
export function badgeFor(completedSeasonCount: number, hasParticipated: boolean): Badge | null {
  for (const tier of TIERS) {
    if (completedSeasonCount >= tier.threshold) {
      return { emoji: tier.emoji, label: tier.label };
    }
  }
  return hasParticipated ? { emoji: "🌱", label: "최초 참여" } : null;
}
