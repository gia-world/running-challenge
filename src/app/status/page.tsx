import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadViewerContext } from "@/lib/viewer";
import { computeSeasonWeeklyStats, emptyWeekStats } from "@/lib/seasonStats";
import { seasonWeekIndexForDate } from "@/lib/season";
import { todayInSeoul } from "@/lib/week";
import { formatKoreanDate } from "@/lib/format";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { StatusBoard } from "./StatusBoard";

type MembershipRow = {
  profiles: { id: string; name: string } | null;
};

export default async function StatusPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const viewer = await loadViewerContext(supabase, user.id);
  if (!viewer.teamId) {
    redirect("/join");
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 pb-20 dark:bg-black">
      <PageHeader>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">현황판</h1>
      </PageHeader>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-6">
        {!viewer.activeSeason ? (
          <p className="mt-10 rounded-xl border-2 border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            지금 진행 중인 시즌이 없어요.
          </p>
        ) : !viewer.isSeasonMember ? (
          <div className="mt-10 flex flex-col gap-2 rounded-xl border-2 border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            <p>
              {formatKoreanDate(viewer.activeSeason.start_date)} ~{" "}
              {formatKoreanDate(viewer.activeSeason.end_date)}
            </p>
            <p>이번 시즌에는 참여 중이 아니에요. 관리자에게 참여를 요청해주세요.</p>
          </div>
        ) : (
          <BoardLoader userId={user.id} teamId={viewer.teamId} season={viewer.activeSeason} />
        )}
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
