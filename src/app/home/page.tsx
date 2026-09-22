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
  seasonWeekCount,
  cappedTodayForSeason,
} from "@/lib/season";
import { requireTeamViewer } from "@/lib/viewer";
import { WeeklyDots } from "@/components/WeeklyDots";
import { PageShell } from "@/components/PageShell";
import { PageTitle } from "@/components/PageTitle";
import { SeasonGate } from "@/components/SeasonGate";
import { BankInfoSheet } from "@/components/BankInfoSheet";
import type { ActivityStatus } from "@/lib/types";

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
      header={<PageTitle>{displayName}님, 안녕하세요 👋</PageTitle>}
      mainClassName="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-10"
      isAdmin={viewer.teamRole === "admin"}
      bottomNav={{ active: "home" }}
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
  const isInGracePeriod =
    season.end_date === yesterdayInSeoul() && isBeforeNoonInSeoul();

  const { data: seasonMembership } = await supabase
    .from("season_memberships")
    .select("renew_next_season")
    .eq("season_id", season.id)
    .eq("user_id", userId)
    .maybeSingle();
  const renewNextSeason = seasonMembership?.renew_next_season ?? null;

  const { data: approvedActivities } = await supabase
    .from("activities")
    .select("activity_date")
    .eq("user_id", userId)
    .eq("season_id", season.id)
    .eq("status", "approved" satisfies ActivityStatus)
    .returns<{ activity_date: string }[]>();

  const weekCount = seasonWeekCount(season.start_date, season.end_date);
  const datesByWeek: Set<string>[] = Array.from(
    { length: weekCount },
    () => new Set(),
  );
  for (const activity of approvedActivities ?? []) {
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

  return (
    <>
      {isInGracePeriod && (
        <p className="rounded-lg bg-warning-subtle px-3 py-2 text-base text-warning">
          ⏰ 시즌이 끝났어요 — 오늘 정오까지 인증하면 이번 시즌 기록으로
          인정돼요.
        </p>
      )}

      <section className="rounded-2xl border border-border bg-surface px-4 py-3 text-center">
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
    </>
  );
}
