import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { requireTeamViewer } from "@/lib/viewer";
import { seasonWeekIndexForDate, seasonWeekRange } from "@/lib/season";
import { todayInSeoul } from "@/lib/week";
import { BankForm } from "@/components/BankForm";
import { RenewalToggle } from "@/components/RenewalToggle";

export default async function MyPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }
  const { viewer } = await requireTeamViewer();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, bank_name, bank_account_number")
    .eq("id", user.id)
    .single();

  // "다음 시즌 연장" 질문은 시즌의 실제 마지막 주(종료일이 속한 주)부터
  // 노출 — 고정된 주차 번호가 아니라 종료일 기준으로 계산해야, 시즌 기간을
  // 4주가 아닌 다른 길이로 조정해도 정확한 마지막 주에 뜸.
  const lastWeekIndex = viewer.activeSeason
    ? seasonWeekIndexForDate(viewer.activeSeason.start_date, viewer.activeSeason.end_date)
    : null;
  const lastWeekStart =
    viewer.activeSeason && lastWeekIndex !== null
      ? seasonWeekRange(viewer.activeSeason.start_date, lastWeekIndex).start
      : null;
  const showRenewalPrompt =
    viewer.isSeasonMember &&
    viewer.activeSeason &&
    lastWeekStart !== null &&
    todayInSeoul() >= lastWeekStart;

  const { data: seasonMembership } =
    showRenewalPrompt && viewer.activeSeason
      ? await supabase
          .from("season_memberships")
          .select("renew_next_season")
          .eq("season_id", viewer.activeSeason.id)
          .eq("user_id", user.id)
          .maybeSingle()
      : { data: null };

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <PageHeader teamName={viewer.teamName}>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          마이페이지
        </h1>
      </PageHeader>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-8">
        <div>
          <h2 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
            {profile?.name ?? "러너"}
          </h2>
        </div>

        {showRenewalPrompt && viewer.activeSeason && (
          <div className="flex flex-col gap-2">
            <h2 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
              다음 시즌
            </h2>
            <RenewalToggle
              seasonId={viewer.activeSeason.id}
              userId={user.id}
              initialChoice={seasonMembership?.renew_next_season ?? null}
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
            계좌 정보
          </h2>
          <p className="text-base text-zinc-500 dark:text-zinc-400">
            참가비 정산(환급/상금)을 받으려면 계좌 등록이 필요해요.
          </p>
          <BankForm
            userId={user.id}
            initialBankName={profile?.bank_name ?? ""}
            initialAccountNumber={profile?.bank_account_number ?? ""}
          />
        </div>

        <Link
          href="/home"
          className="text-sm font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          ← 홈으로
        </Link>
      </main>
    </div>
  );
}
