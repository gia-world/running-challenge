"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { seasonWeekIndexForDate, seasonWeekRange } from "@/lib/season";
import { todayInSeoul } from "@/lib/week";
import {
  NotificationListSheet,
  NOTIFICATIONS_CHANGED_EVENT,
} from "@/components/NotificationListSheet";

/**
 * 헤더의 알림 벨 — 서버에서 currentUserId를 내려받지 않고 브라우저
 * 세션으로 스스로 "내가 누구인지" 알아내서 안읽은 알림 개수만 가져온다.
 * PageShell/PageHeader 시그니처를 안 건드리려고 일부러 이렇게 뺐다.
 *
 * EntryAnnouncementPopup과 같은 기준으로 센다 — 댓글/대댓글/이모지는
 * notifications.read_at 기준, 재인증 요청/정산 보류/자동연장 응답은
 * 실제로 아직 해결 안 됐는지(activity_review_requests.status='pending',
 * seasons.settled_at is null, season_memberships.renew_next_season is
 * null인 채로 마지막 주에 들어섰는지)를 직접 세서 뱃지 숫자가 입장
 * 팝업이랑 어긋나지 않게 한다.
 *
 * 누르면 /notifications로 이동하는 대신 NotificationListSheet를 바로
 * 띄운다("알림 페이지 말고 팝업처럼" 피드백). 이 시트는 벨 말고
 * EntryAnnouncementPopup의 "N개 보기"에서도 독립적으로 열릴 수 있는데
 * — 거기서 읽음 처리해도 이 벨의 뱃지는 알아야 하므로, props 콜백이
 * 아니라 window 이벤트(NOTIFICATIONS_CHANGED_EVENT)를 구독해서 "어느
 * 쪽이 열었든" 뱃지를 다시 센다.
 */
export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function loadCount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: membership } = await supabase
        .from("team_memberships")
        .select("team_id, role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !membership) return;

      const isAdmin = membership.role === "admin";

      const [
        { count: genericCount },
        { count: rejectedCount },
        { data: renewalCandidates },
        pendingReviews,
        pendingSettlements,
      ] = await Promise.all([
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("type", ["comment", "reply", "reaction"])
          .is("read_at", null),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("type", "activity_rejected")
          .is("read_at", null),
        supabase
          .from("season_memberships")
          .select("seasons(start_date, end_date, settled_at)")
          .eq("user_id", user.id)
          .is("renew_next_season", null)
          .returns<
            {
              seasons: { start_date: string; end_date: string; settled_at: string | null } | null;
            }[]
          >(),
        // team_id 필터 없음 — RLS가 이미 본인 팀으로만 걸러준다.
        isAdmin
          ? supabase
              .from("activity_review_requests")
              .select("id", { count: "exact", head: true })
              .eq("status", "pending")
          : Promise.resolve({ count: 0 }),
        isAdmin
          ? supabase
              .from("seasons")
              .select("id", { count: "exact", head: true })
              .eq("team_id", membership.team_id)
              .not("settlement_notified_at", "is", null)
              .is("settled_at", null)
          : Promise.resolve({ count: 0 }),
      ]);

      const today = todayInSeoul();
      const renewalCount = (renewalCandidates ?? []).filter((c) => {
        const season = c.seasons;
        if (!season || season.settled_at) return false;
        const lastWeekIndex = seasonWeekIndexForDate(season.start_date, season.end_date);
        if (lastWeekIndex === null) return false;
        return today >= seasonWeekRange(season.start_date, lastWeekIndex).start;
      }).length;

      if (!cancelled) {
        setUnreadCount(
          (genericCount ?? 0) +
            (rejectedCount ?? 0) +
            renewalCount +
            (pendingReviews.count ?? 0) +
            (pendingSettlements.count ?? 0),
        );
      }
    }

    loadCount();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    function handleChanged() {
      setRefreshKey((k) => k + 1);
    }
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handleChanged);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handleChanged);
  }, []);

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

      {isOpen && <NotificationListSheet onClose={() => setIsOpen(false)} />}
    </>
  );
}
