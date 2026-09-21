import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireTeamViewer } from "@/lib/viewer";
import { seasonWeekIndexForDate, seasonWeekRange, seasonWeekCount } from "@/lib/season";
import { formatKoreanDate } from "@/lib/format";
import { todayInSeoul } from "@/lib/week";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { SeasonGate } from "@/components/SeasonGate";
import { ActivityStatusList, type ActivityListItem } from "@/components/ActivityStatusList";

export default async function HistoryPage() {
  const { user, viewer } = await requireTeamViewer();

  return (
    <div className="flex flex-1 flex-col bg-canvas pb-20">
      <PageHeader teamName={viewer.teamName}>
        <Link
          href="/home"
          className="text-sm font-medium text-ink-tertiary hover:text-ink"
        >
          ← 홈
        </Link>
        <h1 className="mt-1 text-lg font-bold text-ink-strong">시즌 전체 기록</h1>
      </PageHeader>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-6">
        <SeasonGate viewer={viewer}>
          {viewer.activeSeason && <SeasonHistory userId={user.id} season={viewer.activeSeason} />}
        </SeasonGate>
      </main>

      <BottomNav active="home" isAdmin={viewer.teamRole === "admin"} />
    </div>
  );
}

async function SeasonHistory({
  userId,
  season,
}: {
  userId: string;
  season: { id: string; start_date: string; end_date: string };
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select("id, activity_date, distance_km, created_at, status, rejected_reason")
    .eq("user_id", userId)
    .eq("season_id", season.id)
    .order("activity_date", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<(ActivityListItem & { created_at: string })[]>();

  const activities = data ?? [];
  const weekCount = seasonWeekCount(season.start_date, season.end_date);
  const weeks: ActivityListItem[][] = Array.from({ length: weekCount }, () => []);
  for (const activity of activities) {
    const weekIndex = seasonWeekIndexForDate(season.start_date, activity.activity_date);
    if (weekIndex !== null && weekIndex < weekCount) {
      weeks[weekIndex].push(activity);
    }
  }

  const today = todayInSeoul();

  return (
    <>
      {weeks.map((weekActivities, index) => {
        const { start, end } = seasonWeekRange(season.start_date, index);
        const isFutureWeek = start > today;

        return (
          <section key={index}>
            <h2 className="text-base font-semibold text-ink">
              {index + 1}주차 ({formatKoreanDate(start)}~{formatKoreanDate(end)})
            </h2>
            <ActivityStatusList
              activities={weekActivities}
              emptyMessage={isFutureWeek ? `${index + 1}주차도 화이팅!` : "이 주에는 인증 기록이 없어요."}
            />
          </section>
        );
      })}
    </>
  );
}
