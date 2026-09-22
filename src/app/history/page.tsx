import { createClient } from "@/lib/supabase/server";
import { requireTeamViewer } from "@/lib/viewer";
import {
  seasonWeekIndexForDate,
  seasonWeekRange,
  seasonWeekCount,
  cappedTodayForSeason,
} from "@/lib/season";
import { formatKoreanDate } from "@/lib/format";
import { todayInSeoul, isWithinCertificationGrace } from "@/lib/week";
import { getSignedPhotoUrls } from "@/lib/photos";
import { PageShell } from "@/components/PageShell";
import { PageTitle } from "@/components/PageTitle";
import { SectionTitle } from "@/components/SectionTitle";
import { SeasonGate } from "@/components/SeasonGate";
import {
  ActivityStatusList,
  type ActivityListItem,
} from "@/components/ActivityStatusList";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { user, viewer } = await requireTeamViewer();
  const { scope } = await searchParams;
  const weekOnly = scope === "week";

  return (
    <PageShell
      teamName={viewer.teamName}
      header={<PageTitle>{weekOnly ? "이번 주 인증 기록" : "시즌 전체 기록"}</PageTitle>}
      mainClassName="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-6"
      isAdmin={viewer.teamRole === "admin"}
    >
      <SeasonGate viewer={viewer}>
        {viewer.activeSeason && (
          <SeasonHistory userId={user.id} season={viewer.activeSeason} weekOnly={weekOnly} />
        )}
      </SeasonGate>
    </PageShell>
  );
}

async function SeasonHistory({
  userId,
  season,
  weekOnly,
}: {
  userId: string;
  season: { id: string; start_date: string; end_date: string };
  weekOnly: boolean;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select(
      "id, activity_date, distance_km, created_at, status, rejected_reason, activity_photos(storage_path, sort_order)",
    )
    .eq("user_id", userId)
    .eq("season_id", season.id)
    .order("activity_date", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<
      {
        id: string;
        activity_date: string;
        distance_km: number;
        created_at: string;
        status: ActivityListItem["status"];
        rejected_reason: string | null;
        activity_photos: { storage_path: string; sort_order: number }[];
      }[]
    >();

  const activities = await Promise.all(
    (data ?? []).map(async (activity) => ({
      ...activity,
      photoUrls: await getSignedPhotoUrls(supabase, activity.activity_photos),
      photoStoragePaths: activity.activity_photos.map((p) => p.storage_path),
    })),
  );
  const canDeleteThisSeason = isWithinCertificationGrace(season.end_date);
  const weekCount = seasonWeekCount(season.start_date, season.end_date);
  const weeks: ActivityListItem[][] = Array.from(
    { length: weekCount },
    () => [],
  );
  for (const activity of activities) {
    const weekIndex = seasonWeekIndexForDate(
      season.start_date,
      activity.activity_date,
    );
    if (weekIndex !== null && weekIndex < weekCount) {
      weeks[weekIndex].push(activity);
    }
  }

  const today = todayInSeoul();
  // Grace-period capped, same as home's weekly progress card — a day into
  // the grace window still belongs to the season's real last week, not a
  // nonexistent week beyond it.
  const currentWeekIndex =
    seasonWeekIndexForDate(season.start_date, cappedTodayForSeason(season.end_date, today)) ?? 0;
  const weekIndexes = weekOnly ? [currentWeekIndex] : weeks.map((_, index) => index);

  return (
    <>
      {weekIndexes.map((index) => {
        const weekActivities = weeks[index] ?? [];
        const { start, end } = seasonWeekRange(season.start_date, index);
        const isFutureWeek = start > today;

        return (
          <section key={index}>
            <SectionTitle>
              {index + 1}주차 ({formatKoreanDate(start)}~{formatKoreanDate(end)}
              )
            </SectionTitle>
            <ActivityStatusList
              activities={weekActivities}
              emptyMessage={
                isFutureWeek
                  ? `${index + 1}주차도 화이팅!`
                  : "이번 주에는 아직 인증 기록이 없어요."
              }
              canDelete={canDeleteThisSeason}
            />
          </section>
        );
      })}
    </>
  );
}
