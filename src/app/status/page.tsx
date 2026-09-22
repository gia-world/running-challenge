import { createClient } from "@/lib/supabase/server";
import { requireTeamViewer } from "@/lib/viewer";
import { computeSeasonWeeklyStats, emptyWeekStats } from "@/lib/seasonStats";
import { computeTeamSeasonHistory } from "@/lib/seasonHistory";
import { seasonWeekIndexForDate, cappedTodayForSeason, seasonWeekCount } from "@/lib/season";
import { todayInSeoul } from "@/lib/week";
import { PageShell } from "@/components/PageShell";
import { PageTitle } from "@/components/PageTitle";
import { StatusBoard } from "./StatusBoard";

type MembershipRow = {
  profiles: { id: string; name: string } | null;
};

export default async function StatusPage() {
  const { user, viewer } = await requireTeamViewer();
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("team_memberships")
    .select("profiles!user_id(id, name)")
    .eq("team_id", viewer.teamId)
    .returns<MembershipRow[]>();

  const allMembers = (memberships ?? [])
    .map((m) => m.profiles)
    .filter((p): p is { id: string; name: string } => !!p);

  // Lifetime history/badges don't depend on there being an active season —
  // computed unconditionally so the "전체 기록" tab always works, even
  // between seasons or for someone not in the current one. The season
  // still in progress is excluded from completedCount/history — 완주 can
  // only be known once a season actually ends.
  const { seasons, completedCountByUserId, participatedUserIds } = await computeTeamSeasonHistory(
    supabase,
    viewer.teamId,
    user.id,
    viewer.activeSeason?.id ?? null,
  );

  let currentSeasonMembers: { id: string; name: string; weeks: ReturnType<typeof emptyWeekStats> }[] = [];
  let currentWeekIndex = 0;
  let weekCount = 0;
  if (viewer.activeSeason) {
    const season = viewer.activeSeason;
    weekCount = seasonWeekCount(season.start_date, season.end_date);
    const { data: seasonMemberships } = await supabase
      .from("season_memberships")
      .select("user_id")
      .eq("season_id", season.id);
    const participantIds = new Set((seasonMemberships ?? []).map((m) => m.user_id));

    // Unlike completedCount, "최초 참여" only needs to know someone has ever
    // joined a season — that's true the moment they join, so the season
    // still in progress counts here even though it's excluded above.
    for (const id of participantIds) participatedUserIds.add(id);

    if (viewer.isSeasonMember) {
      const weeklyStats = await computeSeasonWeeklyStats(
        supabase,
        season.id,
        season.start_date,
        season.end_date,
      );
      currentSeasonMembers = allMembers
        .filter((p) => participantIds.has(p.id))
        .map((p) => ({ id: p.id, name: p.name, weeks: weeklyStats.get(p.id) ?? emptyWeekStats(weekCount) }));
      const effectiveDate = cappedTodayForSeason(season.end_date, todayInSeoul());
      currentWeekIndex = seasonWeekIndexForDate(season.start_date, effectiveDate) ?? 0;
    }
  }

  const badgeMembers = allMembers
    .map((m) => ({
      id: m.id,
      name: m.name,
      completedCount: completedCountByUserId.get(m.id) ?? 0,
      hasParticipated: participatedUserIds.has(m.id),
    }))
    .sort((a, b) => b.completedCount - a.completedCount || a.name.localeCompare(b.name));

  return (
    <PageShell
      teamName={viewer.teamName}
      header={<PageTitle>현황판</PageTitle>}
      isAdmin={viewer.teamRole === "admin"}
      activeTab="status"
    >
      <StatusBoard
        isSeasonMember={viewer.isSeasonMember}
        activeSeasonRange={viewer.activeSeason}
        members={currentSeasonMembers}
        currentWeekIndex={currentWeekIndex}
        weekCount={weekCount}
        currentUserId={user.id}
        seasonId={viewer.activeSeason?.id ?? ""}
        seasonStartDate={viewer.activeSeason?.start_date ?? ""}
        history={seasons}
        badgeMembers={badgeMembers}
      />
    </PageShell>
  );
}
