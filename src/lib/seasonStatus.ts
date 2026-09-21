export type SeasonStatus = "active" | "settling" | "closed";

/**
 * A season's lifecycle stage: still running (active), its dates have ended
 * but an admin hasn't finished settlement yet (settling), or settlement is
 * done (closed). Closed is permanent once set — settling only reverts to
 * active if the season's own end_date somehow moves later (e.g. an admin
 * edit), not through any UI action.
 */
export function computeSeasonStatus(
  season: { end_date: string; settled_at: string | null },
  today: string,
): SeasonStatus {
  if (season.settled_at) return "closed";
  if (season.end_date < today) return "settling";
  return "active";
}
