import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { PageShell } from "@/components/PageShell";
import { PageTitle } from "@/components/PageTitle";
import { SectionTitle } from "@/components/SectionTitle";
import { BackLink } from "@/components/BackLink";
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
    ? seasonWeekIndexForDate(
        viewer.activeSeason.start_date,
        viewer.activeSeason.end_date,
      )
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
    <PageShell
      teamName={viewer.teamName}
      header={<PageTitle>마이페이지</PageTitle>}
      mainClassName="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-8"
    >
      <BackLink href="/home">← 홈으로</BackLink>

      {showRenewalPrompt && viewer.activeSeason && (
        <div className="flex flex-col gap-2">
          <SectionTitle size="lg">자동 연장</SectionTitle>
          <RenewalToggle
            seasonId={viewer.activeSeason.id}
            userId={user.id}
            initialChoice={seasonMembership?.renew_next_season ?? null}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <SectionTitle size="lg">계좌 정보</SectionTitle>
        <p className="text-sm text-ink-secondary">
          {profile?.bank_account_number
            ? "참가비 정산은 아래 계좌로 진행돼요."
            : " 참가비 정산(환급/상금)을 받으려면 계좌 등록이 필요해요."}
        </p>
        <BankForm
          userId={user.id}
          initialBankName={profile?.bank_name ?? ""}
          initialAccountNumber={profile?.bank_account_number ?? ""}
        />
      </div>
    </PageShell>
  );
}
