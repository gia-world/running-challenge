import { redirect } from "next/navigation";
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
import { BackLink } from "@/components/BackLink";
import { SeasonGate } from "@/components/SeasonGate";
import {
  ActivityStatusList,
  type ActivityListItem,
} from "@/components/ActivityStatusList";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; seasonId?: string }>;
}) {
  const { user, viewer } = await requireTeamViewer();
  const { scope, seasonId } = await searchParams;
  const weekOnly = scope === "week";

  // 개인 시즌 리포트(/season/[seasonId])의 "인증 기록 보기"에서 넘어온
  // 경로 — 그 시즌이 더 이상 viewer.activeSeason이 아니어도(그레이스가
  // 끝난 지난 시즌이어도) 실제 인증 기록을 볼 수 있어야 한다. activeSeason
  // 하나만 보던 아래 기본 경로와 달리, 임의의 과거 시즌 하나를 직접 조회.
  if (seasonId) {
    const supabase = await createClient();
    const { data: season } = await supabase
      .from("seasons")
      .select("id, start_date, end_date, team_id")
      .eq("id", seasonId)
      .maybeSingle();

    if (!season || season.team_id !== viewer.teamId) {
      redirect("/status");
    }

    return (
      <PageShell
        teamName={viewer.teamName}
        header={
          <>
            <BackLink href={`/season/${season.id}`}>← 시즌 리포트</BackLink>
            <PageTitle className="mt-1">
              {formatKoreanDate(season.start_date)} ~ {formatKoreanDate(season.end_date)}
            </PageTitle>
          </>
        }
        mainClassName="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-6"
        isAdmin={viewer.teamRole === "admin"}
      >
        <SeasonHistory userId={user.id} season={season} weekOnly={false} />
      </PageShell>
    );
  }

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
