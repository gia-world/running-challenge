import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { requireTeamViewer } from "@/lib/viewer";
import { todayInSeoul, WEEKLY_GOAL } from "@/lib/week";
import { formatKoreanDate } from "@/lib/format";
import { seasonWeekIndexForDate, seasonWeekRange, cappedTodayForSeason } from "@/lib/season";
import { CertifyForm } from "./CertifyForm";

export default async function CertifyPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { user, viewer } = await requireTeamViewer();
  const { season: seasonChoice } = await searchParams;

  // Only set when a just-ended season's grace window overlaps with a new
  // season that already started back-to-back — the normal case (no
  // overlap) always has graceSeason === null, so everything below reduces
  // to "just use activeSeason", exactly like before this feature existed.
  const hasOverlap = !!viewer.graceSeason;
  const useGrace =
    hasOverlap &&
    (seasonChoice === "grace" || (seasonChoice !== "current" && viewer.isGraceSeasonMember));
  const selectedSeason = useGrace ? viewer.graceSeason : viewer.activeSeason;
  const isSelectedSeasonMember = useGrace ? viewer.isGraceSeasonMember : viewer.isSeasonMember;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 pb-20 dark:bg-black">
      <PageHeader teamName={viewer.teamName}>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">인증하기</h1>
      </PageHeader>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-6">
        {hasOverlap && viewer.activeSeason && viewer.graceSeason && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 text-base">
              <Link
                href="/certify?season=grace"
                className={
                  useGrace
                    ? "flex-1 rounded-xl bg-orange-500 py-2 text-center font-semibold text-white"
                    : "flex-1 rounded-xl bg-zinc-100 py-2 text-center font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                }
              >
                지난 시즌 (~{formatKoreanDate(viewer.graceSeason.end_date)})
              </Link>
              <Link
                href="/certify?season=current"
                className={
                  !useGrace
                    ? "flex-1 rounded-xl bg-orange-500 py-2 text-center font-semibold text-white"
                    : "flex-1 rounded-xl bg-zinc-100 py-2 text-center font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                }
              >
                새 시즌 ({formatKoreanDate(viewer.activeSeason.start_date)}~)
              </Link>
            </div>
            {useGrace && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-base text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                ⏰ 지난 시즌은 오늘 정오까지만 인증할 수 있어요.
              </p>
            )}
          </div>
        )}

        {!selectedSeason ? (
          <EmptyState>
            지금 진행 중인 시즌이 없어요.
            <br />
            관리자가 시즌을 만들면 시작할 수 있어요.
          </EmptyState>
        ) : !isSelectedSeasonMember ? (
          <EmptyState>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              {formatKoreanDate(selectedSeason.start_date)} ~{" "}
              {formatKoreanDate(selectedSeason.end_date)}
            </p>
            <p className="mt-2">
              이 시즌에는 참여 중이 아니에요.
              <br />
              관리자에게 참여를 요청해주세요.
            </p>
          </EmptyState>
        ) : (
          <CertifyFormLoader
            userId={user.id}
            seasonId={selectedSeason.id}
            seasonStartDate={selectedSeason.start_date}
            seasonEndDate={selectedSeason.end_date}
          />
        )}
      </main>

      <BottomNav active="certify" isAdmin={viewer.teamRole === "admin"} />
    </div>
  );
}

async function CertifyFormLoader({
  userId,
  seasonId,
  seasonStartDate,
  seasonEndDate,
}: {
  userId: string;
  seasonId: string;
  seasonStartDate: string;
  seasonEndDate: string;
}) {
  const supabase = await createClient();
  const today = todayInSeoul();
  const maxActivityDate = cappedTodayForSeason(seasonEndDate, today);

  // Capped so a grace-period day (already past end_date) is treated as
  // still belonging to the season's real last week, not a nonexistent week
  // beyond it — otherwise achievedThisWeek/showRenewalPrompt below would
  // look at an empty future week instead of the one that actually matters.
  const currentWeekIndex = seasonWeekIndexForDate(seasonStartDate, maxActivityDate);
  const { start, end } =
    currentWeekIndex !== null
      ? seasonWeekRange(seasonStartDate, currentWeekIndex)
      : { start: today, end: today };

  const [{ data: todaysActivity }, { data: weekActivities }, { data: seasonMembership }] =
    await Promise.all([
      supabase
        .from("activities")
        .select("id")
        .eq("user_id", userId)
        .eq("activity_date", today)
        .neq("status", "rejected")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("activities")
        .select("activity_date")
        .eq("user_id", userId)
        .eq("season_id", seasonId)
        .eq("status", "approved")
        .gte("activity_date", start)
        .lte("activity_date", end),
      supabase
        .from("season_memberships")
        .select("renew_next_season")
        .eq("season_id", seasonId)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  const achievedThisWeek = new Set((weekActivities ?? []).map((a) => a.activity_date)).size;
  // 시즌의 실제 마지막 주(종료일이 속한 주)에 아직 다음 시즌 연장 여부를
  // 답하지 않았으면, 그 주에 인증할 때 바텀싯으로 물어봄 — 답하고 나면
  // 다시 안 뜸. 고정된 주차 번호가 아니라 종료일 기준으로 계산해야, 관리자가
  // 시즌 기간을 4주가 아닌 다른 길이로 조정해도 정확한 마지막 주에 뜸.
  const lastWeekIndex = seasonWeekIndexForDate(seasonStartDate, seasonEndDate);
  const showRenewalPrompt =
    currentWeekIndex !== null &&
    currentWeekIndex === lastWeekIndex &&
    seasonMembership?.renew_next_season == null;

  return (
    <CertifyForm
      userId={userId}
      seasonId={seasonId}
      alreadyCertifiedToday={!!todaysActivity}
      achievedThisWeek={achievedThisWeek}
      weeklyGoal={WEEKLY_GOAL}
      maxActivityDate={maxActivityDate}
      showRenewalPrompt={showRenewalPrompt}
    />
  );
}
