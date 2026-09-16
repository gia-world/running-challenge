import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentWeekRangeInSeoul, WEEKLY_GOAL } from "@/lib/week";
import { formatKoreanDate } from "@/lib/format";
import { WeeklyDots } from "@/components/WeeklyDots";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { SignOutButton } from "./SignOutButton";
import type { Activity } from "@/lib/types";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user.id)
    .single();

  const { start, end } = currentWeekRangeInSeoul();

  const { data: activities } = await supabase
    .from("activities")
    .select("id, activity_date, distance_km, status")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .gte("activity_date", start)
    .lte("activity_date", end)
    .order("activity_date", { ascending: true })
    .returns<Pick<Activity, "id" | "activity_date" | "distance_km" | "status">[]>();

  const weekActivities = activities ?? [];
  const achieved = weekActivities.length;
  const remaining = Math.max(WEEKLY_GOAL - achieved, 0);
  const displayName = profile?.name ?? "러너";

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 pb-20 dark:bg-black">
      <PageHeader action={<SignOutButton />}>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          {displayName}님, 안녕하세요 👋
        </h1>
      </PageHeader>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-10">
        <section className="rounded-2xl bg-white p-6 text-center shadow-sm dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            이번 주 인증 현황
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

        <Link
          href="/certify"
          className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 font-semibold text-white"
        >
          인증하기
        </Link>
      </main>

      <BottomNav active="home" isAdmin={profile?.role === "admin"} />
    </div>
  );
}
