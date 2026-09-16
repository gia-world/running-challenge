import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadViewerContext } from "@/lib/viewer";
import { computeSeasonWeeklyStats, emptyWeekStats } from "@/lib/seasonStats";
import { formatKoreanDate } from "@/lib/format";
import { ParticipantToggle } from "./ParticipantToggle";

type MembershipRow = {
  profiles: { id: string; name: string } | null;
};

export default async function AdminSeasonMembersPage() {
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

  if (!viewer.activeSeason) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">시즌 참여자</h1>
        <p className="rounded-2xl border-2 border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          진행 중인 시즌이 없어요. 시즌 관리에서 먼저 시즌을 만들어주세요.
        </p>
      </div>
    );
  }

  const season = viewer.activeSeason;

  const { data: memberships } = await supabase
    .from("team_memberships")
    .select("profiles!user_id(id, name)")
    .eq("team_id", viewer.teamId)
    .returns<MembershipRow[]>();

  const { data: seasonMemberships } = await supabase
    .from("season_memberships")
    .select("user_id")
    .eq("season_id", season.id);

  const participantIds = new Set((seasonMemberships ?? []).map((m) => m.user_id));
  const weeklyStats = await computeSeasonWeeklyStats(supabase, season.id, season.start_date);

  const members = (memberships ?? [])
    .map((m) => m.profiles)
    .filter((p): p is { id: string; name: string } => !!p)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">시즌 참여자</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatKoreanDate(season.start_date)} ~ {formatKoreanDate(season.end_date)}
        </p>
      </div>

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
