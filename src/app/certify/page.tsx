import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { SeasonGate } from "@/components/SeasonGate";
import { requireTeamViewer } from "@/lib/viewer";
import { todayInSeoul, WEEKLY_GOAL } from "@/lib/week";
import { seasonWeekIndexForDate, seasonWeekRange, SEASON_WEEKS } from "@/lib/season";
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

  const currentWeekIndex = seasonWeekIndexForDate(seasonStartDate, today);
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
  // 4주차(마지막 주)에 아직 다음 시즌 연장 여부를 답하지 않았으면, 그 주에
  // 인증할 때 바텀싯으로 물어봄 — 답하고 나면 다시 안 뜸.
  const showRenewalPrompt =
    currentWeekIndex === SEASON_WEEKS - 1 && seasonMembership?.renew_next_season == null;

  // During the grace period, "today" is the day after the season actually
  // ended — cap the pickable date at the season's real end so a grace-period
  // upload still backfills a day within the season, never one after it
  // (a date past end_date wouldn't map to any week — see seasonWeekIndexForDate).
  const maxActivityDate = seasonEndDate < today ? seasonEndDate : today;

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
