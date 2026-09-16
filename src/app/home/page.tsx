import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { WEEKLY_GOAL, todayInSeoul } from "@/lib/week";
import { seasonWeekIndexForDate, seasonWeekRange, SEASON_WEEKS } from "@/lib/season";
import { loadViewerContext } from "@/lib/viewer";
import { formatKoreanDate } from "@/lib/format";
import { WeeklyDots } from "@/components/WeeklyDots";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { SeasonGate } from "@/components/SeasonGate";
import type { ActivityStatus } from "@/lib/types";
import { SignOutButton } from "./SignOutButton";

const STATUS_BADGES = {
  approved: { label: "인정", className: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400" },
  pending: { label: "심사중", className: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400" },
  rejected: { label: "반려", className: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400" },
} as const;

export default async function HomePage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const viewer = await loadViewerContext(user.id);

  if (!viewer.teamId) {
    redirect("/join");
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  const displayName = profile?.name ?? "러너";

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 pb-20 dark:bg-black">
      <PageHeader action={<SignOutButton />}>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          {displayName}님, 안녕하세요 👋
        </h1>
      </PageHeader>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-10">
        <SeasonGate viewer={viewer}>
          {viewer.activeSeason && <SeasonProgress userId={user.id} season={viewer.activeSeason} />}
        </SeasonGate>

        <Link
          href="/certify"
          className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 font-semibold text-white"
        >
          인증하기
        </Link>
      </main>

      <BottomNav active="home" isAdmin={viewer.teamRole === "admin"} />
    </div>
  );
}

async function SeasonProgress({
  userId,
  season,
}: {
  userId: string;
  season: { id: string; start_date: string; end_date: string };
}) {
  const supabase = await createClient();
  const today = todayInSeoul();
  const currentWeekIndex = seasonWeekIndexForDate(season.start_date, today) ?? 0;
  const { start, end } = seasonWeekRange(season.start_date, currentWeekIndex);

  // Fetched once (every status, not just approved — a crew member needs to
  // see their own pending/rejected submissions and why, not just what
  // counted) and reused for both the season-wide weekly tally and this
  // week's activity list below, rather than querying the season twice.
  const { data: seasonActivitiesRaw } = await supabase
    .from("activities")
    .select("id, activity_date, distance_km, created_at, status, rejected_reason")
    .eq("user_id", userId)
    .eq("season_id", season.id)
    .order("created_at", { ascending: true })
    .returns<
      {
        id: string;
        activity_date: string;
        distance_km: number;
        created_at: string;
        status: ActivityStatus;
        rejected_reason: string | null;
      }[]
    >();

  const seasonActivities = seasonActivitiesRaw ?? [];
  const approvedActivities = seasonActivities.filter((a) => a.status === "approved");

  const datesByWeek: Set<string>[] = Array.from({ length: SEASON_WEEKS }, () => new Set());
  for (const activity of approvedActivities) {
    const weekIndex = seasonWeekIndexForDate(season.start_date, activity.activity_date);
    if (weekIndex !== null) {
      datesByWeek[weekIndex].add(activity.activity_date);
    }
  }

  const successfulWeeks = datesByWeek.filter((dates) => dates.size >= WEEKLY_GOAL).length;
  const achieved = datesByWeek[currentWeekIndex]?.size ?? 0;
  const remaining = Math.max(WEEKLY_GOAL - achieved, 0);

  // Not deduped by date: a rejected submission and the resubmission that
  // replaced it can share a date, and both are worth showing.
  const weekActivities = seasonActivities.filter(
    (activity) => activity.activity_date >= start && activity.activity_date <= end,
  );

  return (
    <>
      <section className="rounded-2xl bg-white p-6 text-center shadow-sm dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          이번 주 인증 현황 ({currentWeekIndex + 1}주차)
        </p>
        <div className="mt-4 flex justify-center">
          <WeeklyDots achieved={achieved} goal={WEEKLY_GOAL} />
        </div>
        <p className="mt-5 text-xl font-bold text-zinc-900 dark:text-zinc-50">
          {achieved} / {WEEKLY_GOAL}회 완료
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {remaining === 0
            ? "이번 주 목표를 다 채웠어요! 🎉"
            : `${remaining}회만 더 뛰면 이번 주 목표 달성이에요`}
        </p>
        <p className="mt-3 text-xs font-medium text-orange-500">
          이번 시즌 {successfulWeeks} / {SEASON_WEEKS}주 성공
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          이번 주 인증 기록
        </h2>
        {weekActivities.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-400 dark:border-zinc-700 dark:text-zinc-600">
            아직 이번 주 인증 기록이 없어요.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {weekActivities.map((activity) => {
              const badge = STATUS_BADGES[activity.status];
              return (
                <li
                  key={activity.id}
                  className="flex flex-col gap-1 rounded-xl bg-white px-4 py-3 text-sm shadow-sm dark:bg-zinc-900"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-600 dark:text-zinc-300">
                        {formatKoreanDate(activity.activity_date)}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {Number(activity.distance_km).toFixed(1)}km
                    </span>
                  </div>
                  {activity.status === "rejected" && activity.rejected_reason && (
                    <p className="text-xs text-red-500 dark:text-red-400">
                      반려 사유: {activity.rejected_reason}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
