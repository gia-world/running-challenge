// Fallback for screens with no team context yet (login/join/onboarding,
// and loading.tsx skeletons that render before any data fetch) — everywhere
// else the team's own name (teams.name) is shown instead.
export const DEFAULT_TEAM_NAME = "RUNNING CHALLENGE";
