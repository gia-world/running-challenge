"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatKoreanDate } from "@/lib/format";

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
  activity_id: string | null;
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
 * 누르면 실제로 가야 할 곳 — 댓글/대댓글/이모지는 그 활동이 있는 피드로
 * (활동이 최신 페이지 밖에 있어도 loadFeed의 highlightActivityId가
 * 따로 끼워 넣어준다). 나머지는 특정 레코드로 바로 못 가서(정산 보류는
 * notifications 테이블에 시즌 id가 안 남아있음) 해당 목록 페이지로.
 */
function hrefForNotification(n: NotificationRow): string {
  if (n.type === "comment" || n.type === "reply" || n.type === "reaction") {
    return n.activity_id ? `/feed?activity=${n.activity_id}` : "/feed";
  }
  if (n.type === "review_request") return "/admin/review";
  if (n.type === "activity_rejected") return "/certify";
  return "/admin/season";
}

/**
 * 알림 벨/입장 팝업의 "N개 보기"에서 공통으로 쓰는 알림 목록. 원래
 * /notifications 전용 페이지였다가 한 번은 바텀시트로 바꿨는데 —
 * "벨은 상단에 있는데 바텀시트는 아래서 올라온다"는 피드백으로 다시
 * 바꿨다. 바텀시트도 아니고 EntryAnnouncementPopup 같은 가운데 모달도
 * 아니라, 헤더 바로 아래 + 벨 쪽에 꼬리가 달린 말풍선 모양 — 벨이든
 * 입장 팝업의 "N개 보기" 링크든 어디서 열려도 "벨에서 나온 알림"이라는
 * 느낌이 들게 한다. 꼬리 위치(`right-14`)는 벨의 실제 DOM 위치를 재서
 * 동적으로 맞춘 게 아니라 벨이 항상 헤더 오른쪽 같은 자리(햄버거 메뉴
 * 바로 왼쪽)에 있다는 걸 알고 CSS로 고정해둔 값이라, 두 입구 어디서
 * 열려도 같은 모양이 나온다.
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
          "id, type, emoji, activity_id, created_at, read_at, profiles!actor_user_id(name), activities(rejected_reason)",
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
    <div
      className="fixed inset-0 z-50 flex justify-center bg-black/40 px-4 pt-16"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md origin-top-right animate-bubble-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden className="absolute -top-1.5 right-14 h-3 w-3 rotate-45 bg-surface" />
        <div className="relative z-10 flex max-h-[70vh] flex-col gap-3 overflow-y-auto rounded-2xl bg-surface p-5 shadow-lg">
          <p className="text-base font-semibold text-ink-strong">알림</p>
          {items === null ? (
            <p className="py-6 text-center text-base text-ink-tertiary">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-base text-ink-tertiary">아직 알림이 없어요.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={hrefForNotification(n)}
                    onClick={onClose}
                    className={
                      n.read_at
                        ? "block rounded-2xl border border-border bg-surface px-4 py-3"
                        : "block rounded-2xl border border-primary-400 bg-primary-50 px-4 py-3"
                    }
                  >
                    <p className="text-base text-ink">{describeNotification(n)}</p>
                    <p className="mt-0.5 text-sm text-ink-tertiary">
                      {formatKoreanDate(n.created_at.slice(0, 10))}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
