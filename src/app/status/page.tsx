import { createClient } from "@/lib/supabase/server";
import { requireTeamViewer } from "@/lib/viewer";
import { computeSeasonWeeklyStats, emptyWeekStats } from "@/lib/seasonStats";
import { computeTeamSeasonHistory } from "@/lib/seasonHistory";
import { seasonWeekIndexForDate } from "@/lib/season";
import { todayInSeoul } from "@/lib/week";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
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
  // between seasons or for someone not in the current one.
  const { seasons, completedCountByUserId, participatedUserIds } = await computeTeamSeasonHistory(
    supabase,
    viewer.teamId,
    user.id,
  );

  const badgeMembers = allMembers
    .map((m) => ({
      id: m.id,
      name: m.name,
      completedCount: completedCountByUserId.get(m.id) ?? 0,
      hasParticipated: participatedUserIds.has(m.id),
    }))
    .sort((a, b) => b.completedCount - a.completedCount || a.name.localeCompare(b.name));

  let currentSeasonMembers: { id: string; name: string; weeks: ReturnType<typeof emptyWeekStats> }[] = [];
  let currentWeekIndex = 0;
  if (viewer.activeSeason && viewer.isSeasonMember) {
    const season = viewer.activeSeason;
    const { data: seasonMemberships } = await supabase
      .from("season_memberships")
      .select("user_id")
      .eq("season_id", season.id);
    const participantIds = new Set((seasonMemberships ?? []).map((m) => m.user_id));
    const weeklyStats = await computeSeasonWeeklyStats(supabase, season.id, season.start_date);

    currentSeasonMembers = allMembers
      .filter((p) => participantIds.has(p.id))
      .map((p) => ({ id: p.id, name: p.name, weeks: weeklyStats.get(p.id) ?? emptyWeekStats() }));
    currentWeekIndex = seasonWeekIndexForDate(season.start_date, todayInSeoul()) ?? 0;
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 pb-20 dark:bg-black">
      <PageHeader teamName={viewer.teamName}>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">현황판</h1>
      </PageHeader>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-6">
        <StatusBoard
          hasActiveSeason={!!viewer.activeSeason}
          isSeasonMember={viewer.isSeasonMember}
          activeSeasonRange={
            viewer.activeSeason
              ? { start: viewer.activeSeason.start_date, end: viewer.activeSeason.end_date }
              : null
          }
          members={currentSeasonMembers}
          currentWeekIndex={currentWeekIndex}
          currentUserId={user.id}
          seasonId={viewer.activeSeason?.id ?? ""}
          seasonStartDate={viewer.activeSeason?.start_date ?? ""}
          history={seasons}
          badgeMembers={badgeMembers}
        />
      </main>

      <BottomNav active="status" isAdmin={viewer.teamRole === "admin"} />
    </div>
  );
}
