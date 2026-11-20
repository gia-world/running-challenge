"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatKoreanDate } from "@/lib/format";
import { BottomSheet } from "@/components/BottomSheet";

type NotificationRow = {
  id: string;
  type:
    | "comment"
    | "reply"
    | "reaction"
    | "review_request"
    | "activity_rejected"
    | "settlement_pending";
  emoji: string | null;
  created_at: string;
  read_at: string | null;
  profiles: { name: string } | null;
  activities: { rejected_reason: string | null } | null;
};

function describeNotification(n: NotificationRow): string {
  const actor = n.profiles?.name ?? "누군가";
  if (n.type === "reaction") return `${actor}님이 회원님 인증에 ${n.emoji ?? "👍"} 반응을 남겼어요`;
  if (n.type === "reply") return `${actor}님이 회원님 댓글에 답글을 남겼어요`;
  if (n.type === "review_request") return `${actor}님이 재인증을 요청했어요. 확인해주세요!`;
  if (n.type === "activity_rejected") {
    const reason = n.activities?.rejected_reason;
    return `인증이 반려됐어요${reason ? ` (사유: ${reason})` : ""}. 새로 업로드해주세요.`;
  }
  if (n.type === "settlement_pending") {
    return "그레이스 기간이 끝났는데 처리할 요청이 남아있어서 시즌이 자동으로 정산되지 않았어요. 확인해주세요!";
  }
  return `${actor}님이 회원님 인증에 댓글을 남겼어요`;
}

/**
 * 알림 벨/입장 팝업의 "N개 보기"에서 공통으로 쓰는 알림 목록 바텀시트.
 * 원래 /notifications 전용 페이지였는데, 배포 후 "알림 페이지 말고
 * 팝업처럼 띄우는 게 낫겠다"는 피드백으로 BottomSheet로 바꿨다.
 *
 * 열리면 댓글/대댓글/이모지 알림만 읽음 처리한다 — 재인증요청/인증반려/
 * 정산보류는 이 목록을 봤다고 해결된 게 아니라서 실제 조치 전까지는
 * 읽음 처리하지 않는다(EntryAnnouncementPopup과 같은 이유).
 *
 * 헤더(PageHeader) 안에서 열리는 오버레이라 HeadingLevelBoundary가
 * 씌워진 <main> 바깥이다 — SectionTitle을 쓰면 실제 h1으로 잘못
 * 렌더링되니, EntryAnnouncementPopup의 "📢 공지사항"처럼 일반 <p>로
 * 제목을 단다.
 */
export function NotificationListSheet({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<NotificationRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data, error } = await supabase
        .from("notifications")
        .select(
          "id, type, emoji, created_at, read_at, profiles!actor_user_id(name), activities(rejected_reason)",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)
        .returns<NotificationRow[]>();

      if (error) console.error("[notifications] failed to load notifications:", error.message);
      if (!cancelled) setItems(data ?? []);

      supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .in("type", ["comment", "reply", "reaction"])
        .is("read_at", null)
        .then(({ error: markError }) => {
          if (markError) console.error("[notifications] mark-read failed:", markError.message);
        });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <BottomSheet onClose={onClose}>
      <p className="mb-3 text-base font-semibold text-ink-strong">알림</p>
      {items === null ? (
        <p className="py-6 text-center text-base text-ink-tertiary">불러오는 중...</p>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-base text-ink-tertiary">아직 알림이 없어요.</p>
      ) : (
        <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
          {items.map((n) => (
            <li
              key={n.id}
              className={
                n.read_at
                  ? "rounded-2xl border border-border bg-surface px-4 py-3"
                  : "rounded-2xl border border-primary-400 bg-primary-50 px-4 py-3"
              }
            >
              <p className="text-base text-ink">{describeNotification(n)}</p>
              <p className="mt-0.5 text-sm text-ink-tertiary">
                {formatKoreanDate(n.created_at.slice(0, 10))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  );
}
