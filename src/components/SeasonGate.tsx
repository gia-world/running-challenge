import type { ReactNode } from "react";
import { formatKoreanDate } from "@/lib/format";
import { EmptyState } from "./EmptyState";
import { AccountNote } from "./AccountNote";

type GatedSeason = { start_date: string; end_date: string } | null;

/**
 * Gates season-dependent content behind the two empty states every
 * season-aware screen needs: no active season yet, or not a participant
 * in the one that's running. Renders children only once both are cleared.
 *
 * Deliberately typed on a plain `{ activeSeason, isSeasonMember }` pair
 * instead of the full `ViewerContext` — certify's grace/새 시즌 picker and
 * StatusBoard's "이번 시즌" tab each gate against whichever season they've
 * currently selected, not necessarily `viewer.activeSeason` itself.
 */
export function SeasonGate({
  viewer,
  seasonLabel = "이번 시즌",
  children,
}: {
  viewer: {
    activeSeason: GatedSeason;
    isSeasonMember: boolean;
    /** 팀 정산 계좌 — 있으면 참가비 입금 안내에 같이 보여준다. */
    teamSettlementBankName?: string | null;
    teamSettlementAccountNumber?: string | null;
  };
  /** Defaults to "이번 시즌" — certify passes "이 시즌" since either its grace or current-season tab can be selected. */
  seasonLabel?: string;
  children: ReactNode;
}) {
  if (!viewer.activeSeason) {
    return (
      <EmptyState>
        지금 진행 중인 시즌이 없어요.
        <br />
        관리자가 시즌을 만들면 시작할 수 있어요.
      </EmptyState>
    );
  }

  if (!viewer.isSeasonMember) {
    const hasTeamAccount = viewer.teamSettlementBankName && viewer.teamSettlementAccountNumber;
    return (
      <EmptyState>
        <p className="text-sm text-ink-tertiary">
          {formatKoreanDate(viewer.activeSeason.start_date)} ~{" "}
          {formatKoreanDate(viewer.activeSeason.end_date)}
        </p>
        <p className="mt-2">
          {seasonLabel}에는 참여 중이 아니에요.
          <br />
          관리자가 입금 확인 후 참여가 승인돼요.
        </p>
        {hasTeamAccount && (
          <AccountNote accountNumber={viewer.teamSettlementAccountNumber!} className="mt-3 text-left">
            참가비 입금 계좌
            <br />
            {viewer.teamSettlementBankName} {viewer.teamSettlementAccountNumber}
          </AccountNote>
        )}
      </EmptyState>
    );
  }

  return <>{children}</>;
}
