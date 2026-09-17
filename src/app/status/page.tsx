import { createClient } from "@/lib/supabase/server";
import { requireTeamViewer } from "@/lib/viewer";
import { computeSeasonWeeklyStats, emptyWeekStats } from "@/lib/seasonStats";
import { seasonWeekIndexForDate } from "@/lib/season";
import { todayInSeoul } from "@/lib/week";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { SeasonGate } from "@/components/SeasonGate";
import { StatusBoard } from "./StatusBoard";

type MembershipRow = {
  profiles: { id: string; name: string } | null;
};

export default async function StatusPage() {
  const { user, viewer } = await requireTeamViewer();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 pb-20 dark:bg-black">
      <PageHeader teamName={viewer.teamName}>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">현황판</h1>
      </PageHeader>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-6">
        <SeasonGate viewer={viewer}>
          {viewer.activeSeason && (
            <BoardLoader userId={user.id} teamId={viewer.teamId} season={viewer.activeSeason} />
          )}
        </SeasonGate>
      </main>

      <BottomNav active="status" isAdmin={viewer.teamRole === "admin"} />
    </div>
  );
}

async function BoardLoader({
  userId,
  teamId,
  season,
}: {
  userId: string;
  teamId: string;
  season: { id: string; start_date: string; end_date: string };
}) {
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("team_memberships")
    .select("profiles!user_id(id, name)")
    .eq("team_id", teamId)
    .returns<MembershipRow[]>();

  const { data: seasonMemberships } = await supabase
    .from("season_memberships")
    .select("user_id")
    .eq("season_id", season.id);

  const participantIds = new Set((seasonMemberships ?? []).map((m) => m.user_id));
  const weeklyStats = await computeSeasonWeeklyStats(supabase, season.id, season.start_date);

  const members = (memberships ?? [])
    .map((m) => m.profiles)
    .filter((p): p is { id: string; name: string } => !!p && participantIds.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      weeks: weeklyStats.get(p.id) ?? emptyWeekStats(),
    }));

  const currentWeekIndex = seasonWeekIndexForDate(season.start_date, todayInSeoul()) ?? 0;

  return (
    <StatusBoard
      members={members}
      currentWeekIndex={currentWeekIndex}
      currentUserId={userId}
      seasonId={season.id}
      seasonStartDate={season.start_date}
    />
  );
}
