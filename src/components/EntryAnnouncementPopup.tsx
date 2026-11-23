"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import type { Announcement, ImportantNotification } from "@/components/useNotificationData";

/**
 * 입장 시 제일 먼저 보여주는 센터 모달 — (1) 아직 못 본 관리자 공지,
 * (2) 실제로 조치해야 하는 중요 알림(재인증 요청/인증 반려/정산 보류)을
 * 한 번에 보여준다. 둘 다 없으면 아예 안 뜬다 — 안읽은 일반 알림(댓글/
 * 대댓글/이모지)만 있는 경우는 벨 뱃지로 충분하다고 보고 이 모달을
 * 띄우지 않는다(한때 "N개 보기" 요약 링크를 여기도 같이 넣어뒀었는데,
 * 지금은 벨이 모든 화면에 상시로 떠서 같은 정보를 중복으로 보여줄
 * 필요가 없어져 뺐다).
 *
 * 데이터는 더 이상 이 컴포넌트가 직접 조회하지 않는다 — PageHeader가
 * `useNotificationData`로 NotificationBell과 공유해서 한 번만 조회한
 * 결과를 `announcements`/`importantNotifications`로 받는다(전에는 이
 * 컴포넌트와 벨이 거의 같은 쿼리를 각자 따로 날리고 있어서, 페이지를
 * 옮길 때마다 중복 조회가 나가고 있었다 — "화면 전환이 느리다" 피드백의
 * 원인). `isReady`가 true로 바뀌는 순간(데이터가 막 도착한 시점) 한
 * 번만 "보여줄지 말지"를 판단하고, 그 뒤로 데이터가 또 바뀌어도(이
 * 컴포넌트 입장에선 안 바뀌지만) 다시 뜨지 않는다.
 *
 * 공지는 profiles.last_seen_announcement_at으로 "진짜 처음 보는지"를
 * 서버 상태로 판단한다(useNotificationData 쪽에서). 중요 알림은
 * notifications.read_at이 아니라 — "확인"을 눌렀다고 실제 조치를 한 건
 * 아니므로 — 실제로 아직 해결 안 됐는지를 매번(PageHeader가 페이지마다
 * 새로 마운트되므로 사실상 페이지를 옮길 때마다) 직접 조회해서, 조치할
 * 때까지 계속 뜨게 한다. 공지/중요 알림 둘 다 세션당 한 번으로 막아두지
 * 않는다 — 중요 알림은 그게 원래 의도(액션을 취할 때까지 계속 보이게)고,
 * 공지는 "확인"을 누르면 profiles.last_seen_announcement_at이 갱신돼서
 * 다음 조회부터 자연히 빠진다.
 *
 * 바텀시트가 아니라 PhotoViewerModal과 같은 센터 모달 톤(bg-black/60 +
 * 가운데 rounded-2xl 카드)을 썼다 — 자동연장 바텀시트를 배경 탭으로
 * 무심코 닫아버려 안 읽고 넘어간 사람들이 있었던 전례가 있어서, 배경
 * 탭으로는 안 닫히게 하고 "확인" 버튼을 직접 눌러야만 닫히게 했다.
 */
export function EntryAnnouncementPopup({
  announcements,
  importantNotifications,
  isReady,
  onConfirm,
}: {
  announcements: Announcement[];
  importantNotifications: ImportantNotification[];
  isReady: boolean;
  /** "확인"을 누르면 호출 — 공지를 봤으면 그 사실을 서버에 남긴다
   * (안 봤으면 호출부가 알아서 아무것도 안 한다). */
  onConfirm: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCheckedReady, setHasCheckedReady] = useState(false);

  if (isReady && !hasCheckedReady) {
    setHasCheckedReady(true);
    if (announcements.length > 0 || importantNotifications.length > 0) {
      setIsOpen(true);
    }
  }

  function handleClose() {
    onConfirm();
    setIsOpen(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl bg-surface p-5 shadow-lg">
        {announcements.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-base font-semibold text-ink-strong">📢 공지사항</p>
            {announcements.map((a) => (
              <p key={a.id} className="text-base text-ink">
                {a.body}
              </p>
            ))}
          </div>
        )}

        {importantNotifications.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-base font-semibold text-ink-strong">🔔 중요 알림</p>
            {importantNotifications.map((n) => (
              <div key={n.id} className="flex flex-col gap-1">
                <Link
                  href={n.href}
                  onClick={handleClose}
                  className="text-base text-ink underline decoration-ink-tertiary"
                >
                  {n.body} →
                </Link>
                {n.hint && (
                  <Link
                    href={n.hint.href}
                    onClick={handleClose}
                    className="text-sm text-ink-tertiary underline"
                  >
                    {n.hint.text} →
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        <Button onClick={handleClose}>확인</Button>
      </div>
    </div>
  );
}
