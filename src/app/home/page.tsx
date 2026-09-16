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
import { SignOutButton } from "./SignOutButton";

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

  // Fetched once and reused for both the season-wide weekly tally and this
  // week's activity list below, rather than querying the season twice.
  const { data: seasonActivitiesRaw } = await supabase
    .from("activities")
    .select("id, activity_date, distance_km, created_at")
    .eq("user_id", userId)
    .eq("season_id", season.id)
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  const seasonActivities = seasonActivitiesRaw ?? [];

  const datesByWeek: Set<string>[] = Array.from({ length: SEASON_WEEKS }, () => new Set());
  for (const activity of seasonActivities) {
    const weekIndex = seasonWeekIndexForDate(season.start_date, activity.activity_date);
    if (weekIndex !== null) {
      datesByWeek[weekIndex].add(activity.activity_date);
    }
  }

  const successfulWeeks = datesByWeek.filter((dates) => dates.size >= WEEKLY_GOAL).length;
  const achieved = datesByWeek[currentWeekIndex]?.size ?? 0;
  const remaining = Math.max(WEEKLY_GOAL - achieved, 0);

  const seenDates = new Set<string>();
  const weekActivities = seasonActivities.filter((activity) => {
    if (activity.activity_date < start || activity.activity_date > end) return false;
    if (seenDates.has(activity.activity_date)) return false;
    seenDates.add(activity.activity_date);
    return true;
  });

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
            {weekActivities.map((activity) => (
              <li
                key={activity.id}
                className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm shadow-sm dark:bg-zinc-900"
              >
                <span className="text-zinc-600 dark:text-zinc-300">
                  {formatKoreanDate(activity.activity_date)}
                </span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {Number(activity.distance_km).toFixed(1)}km
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
