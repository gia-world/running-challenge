import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTeamViewer } from "@/lib/viewer";
import { computeSeasonWeeklyStats, emptyWeekStats } from "@/lib/seasonStats";
import { computeSeasonSettlements } from "@/lib/settlement";
import { computeSeasonStatus } from "@/lib/seasonStatus";
import { seasonWeekCount } from "@/lib/season";
import { todayInSeoul } from "@/lib/week";
import { formatKoreanDate, formatWon } from "@/lib/format";
import { PageShell } from "@/components/PageShell";
import { PageTitle } from "@/components/PageTitle";
import { SectionTitle } from "@/components/SectionTitle";
import { BackLink } from "@/components/BackLink";
import { EmptyState } from "@/components/EmptyState";

export default async function SeasonReportPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const { user, viewer } = await requireTeamViewer();

  const supabase = await createClient();
  const { data: season } = await supabase
    .from("seasons")
    .select("id, team_id, start_date, end_date, entry_fee, refund_per_certification, settled_at")
    .eq("id", seasonId)
    .single();

  // Not found, or someone else's team's season — either way, nothing here
  // for this viewer.
  if (!season || season.team_id !== viewer.teamId) {
    redirect("/status");
  }

  const [{ data: seasonMemberships }, { data: dropoutRequests }] = await Promise.all([
    supabase
      .from("season_memberships")
      .select("user_id, renew_next_season")
      .eq("season_id", season.id),
    supabase
      .from("season_dropout_requests")
      .select("user_id, status, settlement_amount, reason, admin_note")
      .eq("season_id", season.id)
      .order("created_at", { ascending: false }),
  ]);

  const participantIds = new Set((seasonMemberships ?? []).map((m) => m.user_id));
  const renewalByUserId = new Map(
    (seasonMemberships ?? []).map((m) => [m.user_id, m.renew_next_season as boolean | null]),
  );

  // Latest dropout request per user — same "newest first, first-seen wins" rule as the admin season page.
  const dropoutByUserId = new Map<
    string,
    { status: string; settlement_amount: number | null; reason: string | null; admin_note: string | null }
  >();
  for (const r of dropoutRequests ?? []) {
    if (!dropoutByUserId.has(r.user_id)) dropoutByUserId.set(r.user_id, r);
  }

  const viewerDropout = dropoutByUserId.get(user.id) ?? null;
  const wasParticipant = participantIds.has(user.id) || !!viewerDropout;

  if (!wasParticipant) {
    return (
      <PageShell
        teamName={viewer.teamName}
        header={
          <>
            <BackLink href="/status">← 현황판</BackLink>
            <PageTitle className="mt-1">
              {formatKoreanDate(season.start_date)} ~ {formatKoreanDate(season.end_date)}
            </PageTitle>
          </>
        }
        isAdmin={viewer.teamRole === "admin"}
      >
        <EmptyState>이 시즌에는 참여하지 않았어요.</EmptyState>
      </PageShell>
    );
  }

  const weekCount = seasonWeekCount(season.start_date, season.end_date);
  const weeklyStats = await computeSeasonWeeklyStats(
    supabase,
    season.id,
    season.start_date,
    season.end_date,
  );
  const viewerWeeks = weeklyStats.get(user.id) ?? emptyWeekStats(weekCount);
  const viewerCompleted = viewerWeeks.every((w) => w.isSuccess);

  const status = computeSeasonStatus(season, todayInSeoul());
  const hasFees = season.entry_fee != null && season.refund_per_certification != null;
  const entryFee = Number(season.entry_fee);
  const refundPerCertification = Number(season.refund_per_certification);

  // Needs everyone's settlement, not just the viewer's — the prize pool is
  // shared across the whole season, same as the admin season page.
  const relevantUserIds = new Set([...participantIds, ...dropoutByUserId.keys()]);
  const { byUserId: settlements, prizeShare } = computeSeasonSettlements(
    Array.from(relevantUserIds).map((userId) => {
      const dropout = dropoutByUserId.get(userId);
      return {
        userId,
        isParticipant: participantIds.has(userId),
        dropoutStatus: (dropout?.status as "pending" | "approved" | "rejected" | undefined) ?? null,
        dropoutSettlementAmount: dropout?.settlement_amount ?? null,
        weeks: weeklyStats.get(userId) ?? emptyWeekStats(weekCount),
      };
    }),
    entryFee,
    refundPerCertification,
    hasFees,
  );

  const settlement = settlements.get(user.id) ?? null;
  const isRenewing = renewalByUserId.get(user.id) === true;
  const total = settlement
    ? settlement.refund + (settlement.isCompleted ? prizeShare : 0)
    : 0;
  const unpaidAmount = hasFees && settlement ? Math.max(entryFee - settlement.refund, 0) : 0;

  return (
    <PageShell
      teamName={viewer.teamName}
      header={
        <>
          <BackLink href="/status">← 현황판</BackLink>
          <PageTitle className="mt-1">
            {formatKoreanDate(season.start_date)} ~ {formatKoreanDate(season.end_date)}
          </PageTitle>
        </>
      }
      isAdmin={viewer.teamRole === "admin"}
    >
      <div className="flex flex-col gap-2">
        <SectionTitle>시즌 성공 여부</SectionTitle>
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface px-4 py-3">
          <span
            className={
              viewerCompleted
                ? "text-base font-semibold text-success"
                : "text-base font-semibold text-ink"
            }
          >
            {viewerCompleted ? "이번 시즌 성공했어요! 🎉" : "이번 시즌은 목표를 채우지 못했어요."}
          </span>
          <div className="flex gap-1.5">
            {viewerWeeks.map((week, index) => (
              <span
                key={index}
                title={`${index + 1}주차 ${week.achieved}회`}
                className={
                  week.isSuccess
                    ? "flex h-8 w-8 items-center justify-center rounded-lg border border-success bg-surface text-sm font-semibold text-success"
                    : week.achieved > 0
                      ? "flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-ink"
                      : "flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-ink-disabled"
                }
              >
                {week.achieved > 0 ? week.achieved : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <SectionTitle>정산 결과</SectionTitle>
        <div className="flex flex-col gap-1 rounded-2xl border border-border bg-surface px-4 py-3 text-base">
          {viewerDropout?.status === "pending" && (
            <p className="text-ink-secondary">중도하차 요청을 검토 중이에요.</p>
          )}

          {viewerDropout?.status === "approved" && !participantIds.has(user.id) ? (
            <>
              <p className="text-ink">중도하차로 관리자가 정산을 결정했어요.</p>
              <p className="font-semibold text-ink-strong">
                {viewerDropout.settlement_amount != null
                  ? formatWon(Number(viewerDropout.settlement_amount))
                  : "정산 금액은 관리자에게 확인해주세요."}
              </p>
              {viewerDropout.admin_note && (
                <p className="text-sm text-ink-tertiary">{viewerDropout.admin_note}</p>
              )}
            </>
          ) : !hasFees ? (
            <p className="text-ink-secondary">이 시즌은 정산 기능을 사용하지 않았어요.</p>
          ) : status !== "closed" ? (
            <p className="text-ink-secondary">
              아직 정산 전이에요. 관리자가 정산을 완료하면 최종 금액을 볼 수 있어요.
            </p>
          ) : (
            settlement && (
              <>
                {isRenewing ? (
                  <>
                    <p className="text-ink-secondary">
                      환급 {formatWon(settlement.refund)}은 다음 시즌 참가비로 이월돼요.
                    </p>
                    <p className="font-semibold text-ink-strong">
                      {settlement.isCompleted && prizeShare > 0
                        ? `상금 ${formatWon(prizeShare)}을 받아요`
                        : "따로 받을 상금은 없어요"}
                    </p>
                  </>
                ) : settlement.isCompleted && prizeShare > 0 ? (
                  <>
                    <p className="text-ink-secondary">
                      환급 {formatWon(settlement.refund)} + 상금 {formatWon(prizeShare)}
                    </p>
                    <p className="font-semibold text-ink-strong">
                      총 {formatWon(total)}을 받아요
                    </p>
                  </>
                ) : (
                  <p className="font-semibold text-ink-strong">
                    {formatWon(total)}을 받아요
                  </p>
                )}
                {unpaidAmount > 0 && (
                  <p className="text-sm text-danger">
                    참가비 중 {formatWon(unpaidAmount)}은 돌려받지 못해요.
                  </p>
                )}
              </>
            )
          )}
        </div>
      </div>
    </PageShell>
  );
}
