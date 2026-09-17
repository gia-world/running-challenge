import type { ReactNode } from "react";
import type { ViewerContext } from "@/lib/viewer";
import { formatKoreanDate } from "@/lib/format";
import { EmptyState } from "./EmptyState";

/**
 * Gates season-dependent content behind the two empty states every
 * season-aware screen needs: no active season yet, or not a participant
 * in the one that's running. Renders children only once both are cleared.
 */
export function SeasonGate({
  viewer,
  children,
}: {
  viewer: Pick<ViewerContext, "activeSeason" | "isSeasonMember">;
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
    return (
      <EmptyState>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          {formatKoreanDate(viewer.activeSeason.start_date)} ~{" "}
          {formatKoreanDate(viewer.activeSeason.end_date)}
        </p>
        <p className="mt-2">
          이번 시즌에는 참여 중이 아니에요.
          <br />
          관리자에게 참여를 요청해주세요.
        </p>
      </EmptyState>
    );
  }

  return <>{children}</>;
}
