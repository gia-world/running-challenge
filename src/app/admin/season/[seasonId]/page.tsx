import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTeamViewer } from "@/lib/viewer";
import { computeSeasonWeeklyStats, emptyWeekStats } from "@/lib/seasonStats";
import { formatKoreanDate } from "@/lib/format";
import { ParticipantToggle } from "./ParticipantToggle";

type MembershipRow = {
  profiles: { id: string; name: string } | null;
};

export default async function AdminSeasonDetailPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const { viewer } = await requireTeamViewer();

  const supabase = await createClient();
  const { data: season } = await supabase
    .from("seasons")
    .select("id, start_date, end_date")
    .eq("id", seasonId)
    .single();

  if (!season) {
    redirect("/admin/season");
  }

  const { data: memberships } = await supabase
    .from("team_memberships")
    .select("profiles!user_id(id, name)")
    .eq("team_id", viewer.teamId)
    .returns<MembershipRow[]>();

  const { data: seasonMemberships } = await supabase
    .from("season_memberships")
    .select("user_id")
    .eq("season_id", season.id);

  const participantIds = new Set(
    (seasonMemberships ?? []).map((m) => m.user_id),
  );
  const weeklyStats = await computeSeasonWeeklyStats(
    supabase,
    season.id,
    season.start_date,
  );
  const isActive = season.id === viewer.activeSeason?.id;

  const members = (memberships ?? [])
    .map((m) => m.profiles)
    .filter((p): p is { id: string; name: string } => !!p)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/admin/season"
          className="text-sm font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          ← 시즌 관리
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {formatKoreanDate(season.start_date)} ~{" "}
            {formatKoreanDate(season.end_date)}
          </h1>
          {isActive && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-sm font-medium text-orange-600 dark:bg-orange-950 dark:text-orange-400">
              진행중
            </span>
          )}
        </div>
      </div>
      <h2 className=" text-zinc-500 dark:text-zinc-400 mt-2">참여자</h2>
      <ul className="flex flex-col gap-2">
        {members.map((member) => {
          const isParticipant = participantIds.has(member.id);
          const weeks = weeklyStats.get(member.id) ?? emptyWeekStats();
          return (
            <li
              key={member.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-zinc-900"
            >
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {member.name}
                </span>
                {isParticipant && (
                  <div className="flex gap-1">
                    {weeks.map((week, index) => (
                      <span
                        key={index}
                        title={`${index + 1}주차 ${week.achieved}회`}
                        className={
                          week.isSuccess
                            ? "h-2.5 w-2.5 rounded-full bg-green-500"
                            : week.achieved > 0
                              ? "h-2.5 w-2.5 rounded-full bg-zinc-400"
                              : "h-2.5 w-2.5 rounded-full bg-zinc-200 dark:bg-zinc-700"
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
              <ParticipantToggle
                seasonId={season.id}
                userId={member.id}
                initialIsParticipant={isParticipant}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
