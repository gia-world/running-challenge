import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTeamViewer } from "@/lib/viewer";
import { computeSeasonWeeklyStats, emptyWeekStats } from "@/lib/seasonStats";
import {
  computeParticipantSettlement,
  computePrizeShare,
} from "@/lib/settlement";
import { formatKoreanDate, formatWon } from "@/lib/format";
import { isBeforeNoonInSeoul, todayInSeoul, yesterdayInSeoul } from "@/lib/week";
import { seasonParticipantJoinDeadlineDate, seasonWeekCount } from "@/lib/season";
import { computeSeasonStatus } from "@/lib/seasonStatus";
import { PageTitle } from "@/components/PageTitle";
import { SectionTitle } from "@/components/SectionTitle";
import { BackLink } from "@/components/BackLink";
import { ParticipantToggle } from "./ParticipantToggle";
import { SeasonFeeForm } from "./SeasonFeeForm";
import { SettleSeasonButton } from "./SettleSeasonButton";

type Member = {
  id: string;
  name: string;
  bank_name: string | null;
  bank_account_number: string | null;
};

type MembershipRow = {
  profiles: Member | null;
};

export default async function AdminSeasonDetailPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  const { viewer } = await requireTeamViewer();

  const supabase = await createClient();
  const { data: season } = await supabase
    .from("seasons")
    .select(
      "id, start_date, end_date, entry_fee, refund_per_certification, settled_at",
    )
    .eq("id", seasonId)
    .single();

  if (!season) {
    redirect("/admin/season");
  }

  const { data: memberships } = await supabase
    .from("team_memberships")
    .select("profiles!user_id(id, name, bank_name, bank_account_number)")
    .eq("team_id", viewer.teamId)
    .returns<MembershipRow[]>();

  const { data: seasonMemberships } = await supabase
    .from("season_memberships")
    .select("user_id, renew_next_season")
    .eq("season_id", season.id);

  const { data: dropoutRequests } = await supabase
    .from("season_dropout_requests")
    .select("id, user_id, status, settlement_amount, reason")
    .eq("season_id", season.id)
    .order("created_at", { ascending: false });

  // Latest request per user — rows are already newest-first, so the first
  // one seen for a given user is the one that matters (a rejected request
  // doesn't block them from requesting again later).
  const dropoutByUserId = new Map<
    string,
    { id: string; status: string; settlement_amount: number | null; reason: string }
  >();
  for (const r of dropoutRequests ?? []) {
    if (!dropoutByUserId.has(r.user_id)) dropoutByUserId.set(r.user_id, r);
  }

  const participantIds = new Set(
    (seasonMemberships ?? []).map((m) => m.user_id),
  );
  const renewalByUserId = new Map(
    (seasonMemberships ?? []).map((m) => [
      m.user_id,
      m.renew_next_season as boolean | null,
    ]),
  );
  const weeklyStats = await computeSeasonWeeklyStats(
    supabase,
    season.id,
    season.start_date,
    season.end_date,
  );
  const weekCount = seasonWeekCount(season.start_date, season.end_date);
  const today = todayInSeoul();
  const status = computeSeasonStatus(season, today);
  const joinDeadlineDate = seasonParticipantJoinDeadlineDate(season.start_date);
  const canAddParticipant =
    today < joinDeadlineDate || (today === joinDeadlineDate && isBeforeNoonInSeoul());

  let hasPendingReviewRequests = false;
  if (status === "settling") {
    const { data: seasonActivities } = await supabase
      .from("activities")
      .select("id")
      .eq("season_id", season.id);
    const seasonActivityIds = (seasonActivities ?? []).map((a) => a.id);

    if (seasonActivityIds.length > 0) {
      const { data: pendingRequests } = await supabase
        .from("activity_review_requests")
        .select("activity_id")
        .eq("status", "pending")
        .in("activity_id", seasonActivityIds);
      hasPendingReviewRequests = (pendingRequests ?? []).length > 0;
    }
  }
  // A pending dropout request drops out of admin/dropout's own queue the
  // moment the season is settled (it filters out settled seasons), so
  // settling with one still open leaves it stuck forever with no way to
  // resolve it from the UI — worth the same settle-time warning as a
  // pending review request.
  const hasPendingDropoutRequests = (dropoutRequests ?? []).some(
    (r) => r.status === "pending",
  );
  // Mirrors the grace-period rule in loadViewerContext: a season that ended
  // yesterday still accepts certifications until noon KST today, so the
  // settlement totals below can still shift until that window closes.
  const isInGracePeriod =
    season.end_date === yesterdayInSeoul() && isBeforeNoonInSeoul();

  const members = (memberships ?? [])
    .map((m) => m.profiles)
    .filter((p): p is Member => !!p)
    .sort((a, b) => a.name.localeCompare(b.name));

  const hasFees =
    season.entry_fee != null && season.refund_per_certification != null;
  const entryFee = Number(season.entry_fee);
  const refundPerCertification = Number(season.refund_per_certification);

  // "Approved dropout" only overrides settlement while they're actually
  // gone — an admin can still re-add someone after approving their
  // dropout (e.g. undoing a mistake within the join window), and once
  // they're back as a real participant the stale old decision shouldn't
  // keep overriding what they've actually certified since.
  function isDroppedOut(memberId: string): boolean {
    return (
      dropoutByUserId.get(memberId)?.status === "approved" &&
      !participantIds.has(memberId)
    );
  }

  const settlements = new Map(
    members
      // Approving a dropout removes the season_membership row (they're no
      // longer a current participant), but their settlement still needs to
      // show — so include anyone still-dropped-out alongside actual
      // current participants. Unlike the per-certification formula below,
      // an approved dropout's admin-decided amount doesn't depend on the
      // season having entry_fee/refund_per_certification set at all (a
      // season with 정산 기능 off can still record one-off dropout
      // settlements), so this filter/branch runs regardless of hasFees.
      .filter((m) => isDroppedOut(m.id) || (hasFees && participantIds.has(m.id)))
      .map((m) => {
        if (isDroppedOut(m.id)) {
          const dropout = dropoutByUserId.get(m.id)!;
          return [
            m.id,
            {
              refundableCount: 0,
              refund: Number(dropout.settlement_amount ?? 0),
              isCompleted: false,
            },
          ] as const;
        }
        return [
          m.id,
          computeParticipantSettlement(
            weeklyStats.get(m.id) ?? emptyWeekStats(weekCount),
            entryFee,
            refundPerCertification,
          ),
        ] as const;
      }),
  );
  const prizeShare = computePrizeShare(Array.from(settlements.values()), entryFee);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <BackLink href="/admin/season">← 시즌 관리</BackLink>
        <div className="mt-1 flex items-center gap-2">
          <PageTitle>
            {formatKoreanDate(season.start_date)} ~{" "}
            {formatKoreanDate(season.end_date)}
          </PageTitle>
          {status === "active" && (
            <span className="rounded-full bg-success-subtle px-2 py-0.5 text-sm font-medium text-success">
              진행중
            </span>
          )}
          {status === "settling" && (
            <span className="rounded-full bg-warning-subtle px-2 py-0.5 text-sm font-medium text-warning">
              정산중
            </span>
          )}
          {status === "closed" && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-sm font-medium text-ink-secondary">
              시즌 종료
            </span>
          )}
        </div>
      </div>

      {isInGracePeriod && (
        <p className="rounded-lg bg-warning-subtle px-3 py-2 text-base text-warning">
          ⏰ 오늘 정오까지 인증하면 인정돼요. 정산 금액이 아직 바뀔 수 있어요.
        </p>
      )}

      {status === "settling" && (
        <SettleSeasonButton
          seasonId={season.id}
          hasPendingReviewRequests={hasPendingReviewRequests}
          hasPendingDropoutRequests={hasPendingDropoutRequests}
          isInGracePeriod={isInGracePeriod}
        />
      )}

      <SeasonFeeForm
        seasonId={season.id}
        seasonStartDate={season.start_date}
        seasonEndDate={season.end_date}
        initialEntryFee={season.entry_fee}
        initialRefundPerCertification={season.refund_per_certification}
        readOnly={status === "closed"}
      />

      <SectionTitle className="mt-2">참여자</SectionTitle>
      {status === "active" && !canAddParticipant && (
        <p className="text-sm text-ink-tertiary">
          참여 추가는 시즌 시작 5일째 정오까지만 가능해요.
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {members.map((member) => {
          const isParticipant = participantIds.has(member.id);
          const dropout = dropoutByUserId.get(member.id);
          const weeks = weeklyStats.get(member.id) ?? emptyWeekStats(weekCount);
          const settlement = settlements.get(member.id);
          const total = settlement
            ? settlement.refund + (settlement.isCompleted ? prizeShare : 0)
            : 0;
          const isRenewing = renewalByUserId.get(member.id) === true;
          const amountToSend = settlement
            ? isRenewing
              ? settlement.isCompleted
                ? prizeShare
                : 0
              : total
            : 0;
          return (
            <li
              key={member.id}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-surface px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-ink-strong">
                      {member.name}
                    </span>
                    {dropout?.status === "pending" && (
                      <span className="rounded-full bg-warning-subtle px-2 py-0.5 text-sm font-medium text-warning">
                        중도하차 검토중
                      </span>
                    )}
                    {isDroppedOut(member.id) && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-sm font-medium text-ink-secondary">
                        중도하차
                      </span>
                    )}
                  </div>
                  {(isParticipant || isDroppedOut(member.id)) && (
                    <div className="flex gap-1">
                      {weeks.map((week, index) => (
                        <span
                          key={index}
                          title={`${index + 1}주차 ${week.achieved}회`}
                          className={
                            week.isSuccess
                              ? "h-2.5 w-2.5 rounded-full bg-success"
                              : week.achieved > 0
                                ? "h-2.5 w-2.5 rounded-full bg-ink-tertiary"
                                : "h-2.5 w-2.5 rounded-full bg-muted-strong"
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
                {status === "active" && (isParticipant || canAddParticipant) && (
                  <ParticipantToggle
                    seasonId={season.id}
                    userId={member.id}
                    memberName={member.name}
                    initialIsParticipant={isParticipant}
                    pendingDropoutRequestId={
                      dropout?.status === "pending" ? dropout.id : null
                    }
                    maxSettlementAmount={hasFees ? entryFee : null}
                  />
                )}
              </div>

              {settlement && (
                <div className="flex flex-col gap-1 rounded-lg bg-subtle px-3 py-2 text-base">
                  {isRenewing ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-ink-secondary">
                        다음 시즌 연장 (환급 {formatWon(settlement.refund)}{" "}
                        이월)
                      </span>
                      <span className="font-semibold text-ink-strong">
                        {amountToSend > 0
                          ? `상금 ${formatWon(amountToSend)} 송금`
                          : "송금 없음"}
                      </span>
                    </div>
                  ) : settlement.isCompleted && prizeShare > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-ink-secondary">
                        환급 {formatWon(settlement.refund)} + 상금{" "}
                        {formatWon(prizeShare)}
                      </span>
                      <span className="font-semibold text-ink-strong">
                        = {formatWon(total)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-ink-secondary">
                        총 환급액
                      </span>
                      <span className="font-semibold text-ink-strong">
                        {formatWon(total)}
                      </span>
                    </div>
                  )}
                  <span className="text-ink-secondary">
                    {member.bank_name && member.bank_account_number
                      ? `${member.bank_name} ${member.bank_account_number}`
                      : "계좌 미등록"}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
