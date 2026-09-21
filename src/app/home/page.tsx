import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  WEEKLY_GOAL,
  todayInSeoul,
  isBeforeNoonInSeoul,
  yesterdayInSeoul,
} from "@/lib/week";
import {
  seasonWeekIndexForDate,
  seasonWeekRange,
  seasonWeekCount,
  cappedTodayForSeason,
} from "@/lib/season";
import { formatKoreanDate } from "@/lib/format";
import { requireTeamViewer } from "@/lib/viewer";
import { WeeklyDots } from "@/components/WeeklyDots";
import { PageShell } from "@/components/PageShell";
import { PageTitle } from "@/components/PageTitle";
import { SectionTitle } from "@/components/SectionTitle";
import { SeasonGate } from "@/components/SeasonGate";
import { ActivityStatusList } from "@/components/ActivityStatusList";
import { BankInfoSheet } from "@/components/BankInfoSheet";
import type { ActivityStatus } from "@/lib/types";
import { SignOutButton } from "./SignOutButton";

export default async function HomePage() {
  const { user, viewer } = await requireTeamViewer();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, bank_name, bank_account_number")
    .eq("id", user.id)
    .single();

  const displayName = profile?.name ?? "러너";
  const needsBankInfo =
    viewer.isSeasonMember &&
    (!profile?.bank_name || !profile?.bank_account_number);

  return (
    <PageShell
      teamName={viewer.teamName}
      headerAction={
        <div className="flex items-center gap-3">
          <Link
            href="/mypage"
            className="text-sm font-medium text-ink-secondary hover:text-ink"
          >
            마이페이지
          </Link>
          <SignOutButton />
        </div>
      }
      header={<PageTitle>{displayName}님, 안녕하세요 👋</PageTitle>}
      mainClassName="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-10"
      bottomNav={{ active: "home", isAdmin: viewer.teamRole === "admin" }}
    >
      {viewer.graceSeason && viewer.isGraceSeasonMember && (
        <Link
          href="/certify?season=grace"
          className="rounded-lg bg-warning-subtle px-3 py-2 text-base text-warning"
        >
          ⏰ 새 시즌이 시작됐지만, 지난 시즌은 오늘 정오까지 인증할 수 있어요 →
        </Link>
      )}

      <SeasonGate viewer={viewer}>
        {viewer.activeSeason && (
          <SeasonProgress userId={user.id} season={viewer.activeSeason} />
        )}
      </SeasonGate>

      {viewer.activeSeason && (
        <Link
          href="/certify"
          className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-semibold text-white"
        >
          인증하기
        </Link>
      )}

      {needsBankInfo && <BankInfoSheet userId={user.id} />}
    </PageShell>
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
  const effectiveDate = cappedTodayForSeason(season.end_date, today);
  const currentWeekIndex =
    seasonWeekIndexForDate(season.start_date, effectiveDate) ?? 0;
  const { start, end } = seasonWeekRange(season.start_date, currentWeekIndex);
  const isInGracePeriod =
    season.end_date === yesterdayInSeoul() && isBeforeNoonInSeoul();

  const { data: seasonMembership } = await supabase
    .from("season_memberships")
    .select("renew_next_season")
    .eq("season_id", season.id)
    .eq("user_id", userId)
    .maybeSingle();
  const renewNextSeason = seasonMembership?.renew_next_season ?? null;

  // Fetched once (every status, not just approved — a crew member needs to
  // see their own pending/rejected submissions and why, not just what
  // counted) and reused for both the season-wide weekly tally and this
  // week's activity list below, rather than querying the season twice.
  const { data: seasonActivitiesRaw } = await supabase
    .from("activities")
    .select(
      "id, activity_date, distance_km, created_at, status, rejected_reason",
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
        status: ActivityStatus;
        rejected_reason: string | null;
      }[]
    >();

  const seasonActivities = seasonActivitiesRaw ?? [];
  const approvedActivities = seasonActivities.filter(
    (a) => a.status === "approved",
  );

  const weekCount = seasonWeekCount(season.start_date, season.end_date);
  const datesByWeek: Set<string>[] = Array.from(
    { length: weekCount },
    () => new Set(),
  );
  for (const activity of approvedActivities) {
    const weekIndex = seasonWeekIndexForDate(
      season.start_date,
      activity.activity_date,
    );
    if (weekIndex !== null && weekIndex < weekCount) {
      datesByWeek[weekIndex].add(activity.activity_date);
    }
  }

  const successfulWeeks = datesByWeek.filter(
    (dates) => dates.size >= WEEKLY_GOAL,
  ).length;
  const achieved = datesByWeek[currentWeekIndex]?.size ?? 0;
  const remaining = Math.max(WEEKLY_GOAL - achieved, 0);

  // Not deduped by date: a rejected submission and the resubmission that
  // replaced it can share a date, and both are worth showing.
  const weekActivities = seasonActivities.filter(
    (activity) =>
      activity.activity_date >= start && activity.activity_date <= end,
  );

  return (
    <>
      {isInGracePeriod && (
        <p className="rounded-lg bg-warning-subtle px-3 py-2 text-base text-warning">
          ⏰ 시즌이 끝났어요 — 오늘 정오까지 인증하면 이번 시즌 기록으로
          인정돼요.
        </p>
      )}

      <section className="rounded-2xl border border-border bg-surface p-6 text-center">
        <p className="text-base font-medium text-ink-secondary">
          이번 주 인증 현황 ({currentWeekIndex + 1}주차)
        </p>
        <div className="mt-4 flex justify-center">
          <WeeklyDots achieved={achieved} goal={WEEKLY_GOAL} />
        </div>
        <p className="mt-5 text-xl font-bold text-ink-strong">
          {achieved} / {WEEKLY_GOAL}회 완료
        </p>
        <p className="mt-1 text-base text-ink-secondary">
          {remaining === 0
            ? "이번 주 목표를 다 채웠어요! 🎉"
            : `${remaining}회만 더 뛰면 이번 주 목표 달성이에요`}
        </p>
        <p className="mt-3 text-sm font-medium text-primary">
          이번 시즌 {successfulWeeks} / {weekCount}주 성공
        </p>
        {renewNextSeason !== null && (
          <p className="mt-1 text-sm text-ink-tertiary">
            다음 시즌:{" "}
            {renewNextSeason
              ? "연장 예정 (참가비 자동 이월)"
              : "이번 시즌으로 마무리"}
          </p>
        )}
      </section>

      <section>
        <SectionTitle>
          이번 주 인증 기록 ({formatKoreanDate(start)}~{formatKoreanDate(end)})
        </SectionTitle>
        <ActivityStatusList
          activities={weekActivities}
          emptyMessage="아직 이번 주 인증 기록이 없어요."
        />
        <Link
          href="/history"
          className="mt-3 block text-center text-sm font-medium text-ink-tertiary hover:text-ink"
        >
          시즌 전체 기록 보기 →
        </Link>
      </section>
    </>
  );
}
