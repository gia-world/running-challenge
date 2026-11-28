"use client";

import { useState } from "react";
import { NotificationListSheet } from "@/components/NotificationListSheet";

/**
 * 헤더의 알림 벨 — 뱃지 숫자는 더 이상 직접 조회하지 않는다. 전에는
 * EntryAnnouncementPopup과 거의 똑같은 쿼리(team_membership, 재인증
 * 요청/정산 보류/자동연장 응답/댓글·대댓글·이모지 안읽음 개수)를 이
 * 벨이 따로 또 조회하고 있어서, 페이지를 옮길 때마다 같은 데이터가
 * 두 번씩 나가고 있었다("화면 전환이 느리다" 피드백의 원인) — 지금은
 * PageHeader가 `useNotificationData`로 한 번만 계산해서 `unreadCount`로
 * 내려준다.
 *
 * `onRead`는 시트 안에서 알림을 읽음 처리할 때(한 건 클릭 또는 "모두
 * 확인") 호출돼서 PageHeader의 안읽은 개수를 그만큼 바로 줄이게 한다.
 */
export function NotificationBell({
  unreadCount,
  onRead,
}: {
  unreadCount: number;
  onRead: (markedCount: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="알림"
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-xl text-ink hover:bg-muted"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-sm font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && <NotificationListSheet onClose={() => setIsOpen(false)} onChange={onRead} />}
    </>
  );
}
