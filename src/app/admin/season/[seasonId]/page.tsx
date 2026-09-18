import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTeamViewer } from "@/lib/viewer";
import { computeSeasonWeeklyStats, emptyWeekStats } from "@/lib/seasonStats";
import {
  computeParticipantSettlement,
  computePrizeShare,
} from "@/lib/settlement";
import { formatKoreanDate, formatWon } from "@/lib/format";
import { isBeforeNoonInSeoul, yesterdayInSeoul } from "@/lib/week";
import { ParticipantToggle } from "./ParticipantToggle";
import { SeasonFeeForm } from "./SeasonFeeForm";

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
    .select("id, start_date, end_date, entry_fee, refund_per_certification")
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
  );
  const isActive = season.id === viewer.activeSeason?.id;
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

  const settlements = hasFees
    ? new Map(
        members
          .filter((m) => participantIds.has(m.id))
          .map((m) => [
            m.id,
            computeParticipantSettlement(
              weeklyStats.get(m.id) ?? emptyWeekStats(),
              entryFee,
              refundPerCertification,
            ),
          ]),
      )
    : new Map();
  const prizeShare = hasFees
    ? computePrizeShare(Array.from(settlements.values()), entryFee)
    : 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/admin/season"
          className="text-sm font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          ← 시즌 관리
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {formatKoreanDate(season.start_date)} ~{" "}
            {formatKoreanDate(season.end_date)}
          </h1>
          {isActive && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-sm font-medium text-orange-600 dark:bg-orange-950 dark:text-orange-400">
              진행중
            </span>
          )}
        </div>
      </div>

      {isInGracePeriod && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-base text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          ⏰ 오늘 정오까지 인증하면 인정돼요. 정산 금액이 아직 바뀔 수 있어요.
        </p>
      )}

      <SeasonFeeForm
        seasonId={season.id}
        initialEntryFee={season.entry_fee}
        initialRefundPerCertification={season.refund_per_certification}
      />

      <h2 className=" text-zinc-500 dark:text-zinc-400 mt-2">참여자</h2>
      <ul className="flex flex-col gap-2">
        {members.map((member) => {
          const isParticipant = participantIds.has(member.id);
          const weeks = weeklyStats.get(member.id) ?? emptyWeekStats();
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
              className="flex flex-col gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {member.name}
                  </span>
                  {isParticipant && (
                    <div className="flex gap-1">
                      {weeks.map((week, index) => (
                        <span
                          key={index}
                          title={`${index + 1}주차 ${week.achieved}회`}
                          className={
                            week.isSuccess
                              ? "h-2.5 w-2.5 rounded-full bg-green-500"
                              : week.achieved > 0
                                ? "h-2.5 w-2.5 rounded-full bg-zinc-400"
                                : "h-2.5 w-2.5 rounded-full bg-zinc-200 dark:bg-zinc-700"
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
                <ParticipantToggle
                  seasonId={season.id}
                  userId={member.id}
                  initialIsParticipant={isParticipant}
                />
              </div>

              {settlement && (
                <div className="flex flex-col gap-1 rounded-lg bg-zinc-50 px-3 py-2 text-base dark:bg-zinc-800">
                  {isRenewing ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        다음 시즌 연장 (환급 {formatWon(settlement.refund)}{" "}
                        이월)
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {amountToSend > 0
                          ? `상금 ${formatWon(amountToSend)} 송금`
                          : "송금 없음"}
                      </span>
                    </div>
                  ) : settlement.isCompleted && prizeShare > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        환급 {formatWon(settlement.refund)} + 상금{" "}
                        {formatWon(prizeShare)}
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                        = {formatWon(total)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        총 환급액
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {formatWon(total)}
                      </span>
                    </div>
                  )}
                  <span className="text-zinc-500 dark:text-zinc-400">
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
