import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { SeasonGate } from "@/components/SeasonGate";
import { requireTeamViewer } from "@/lib/viewer";
import { todayInSeoul, WEEKLY_GOAL } from "@/lib/week";
import { seasonWeekIndexForDate, seasonWeekRange, cappedTodayForSeason } from "@/lib/season";
import { CertifyForm } from "./CertifyForm";

export default async function CertifyPage() {
  const { user, viewer } = await requireTeamViewer();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 pb-20 dark:bg-black">
      <PageHeader teamName={viewer.teamName}>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">인증하기</h1>
      </PageHeader>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-6">
        <SeasonGate viewer={viewer}>
          {viewer.activeSeason && (
            <CertifyFormLoader
              userId={user.id}
              seasonId={viewer.activeSeason.id}
              seasonStartDate={viewer.activeSeason.start_date}
              seasonEndDate={viewer.activeSeason.end_date}
            />
          )}
        </SeasonGate>
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
