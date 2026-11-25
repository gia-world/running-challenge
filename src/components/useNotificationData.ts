"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { seasonWeekIndexForDate, seasonWeekRange } from "@/lib/season";
import { todayInSeoul } from "@/lib/week";

const CONFIRMED_ANNOUNCEMENTS_KEY = "runchall:confirmedAnnouncementIds";

/**
 * "확인"을 누르면 profiles.last_seen_announcement_at을 서버에 써서 다음
 * 조회부터 안 보이게 하는데, 그 write가 네트워크를 타는 동안 바로 다른
 * 화면으로 넘어가면 — PageHeader가 페이지마다 새로 마운트되니 그 즉시
 * 또 조회가 나가는데 — 아직 반영 안 된 값으로 조회해서 "방금 확인한"
 * 공지가 또 안 읽은 것처럼 잡혀 팝업이 두 번 뜨는 걸로 보였다. 서버
 * write가 끝나길 기다리는 대신, "확인"을 누른 공지 id를 이 탭의
 * sessionStorage에 바로(동기적으로) 남겨서, 서버 값이 따라오기 전까지는
 * 로컬에서 한 번 더 걸러낸다 — 기기/세션을 넘어가는 진짜 "안 읽음"
 * 판단은 여전히 서버 값이 맡는다.
 */
function getConfirmedAnnouncementIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(CONFIRMED_ANNOUNCEMENTS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function addConfirmedAnnouncementIds(ids: string[]) {
  try {
    const next = getConfirmedAnnouncementIds();
    for (const id of ids) next.add(id);
    sessionStorage.setItem(CONFIRMED_ANNOUNCEMENTS_KEY, JSON.stringify([...next]));
  } catch {
    // 시크릿 모드 등으로 sessionStorage를 못 쓰면 이 보정만 못 받을 뿐 —
    // 서버 값은 곧 따라오니 최악의 경우도 한 번 더 보이는 정도다.
  }
}

export type Announcement = { id: string; body: string };
export type ImportantNotification = {
  id: string;
  body: string;
  href: string;
  /** 재인증 요청/정산 보류처럼 명확한 단일 액션이 아니라, 추가로 안내할
   * 게 있을 때만(지금은 자동연장 미응답 → 설정 안내) 쓰는 보조 줄. */
  hint?: { text: string; href: string };
};

/**
 * PageHeader가 한 번만 호출해서 NotificationBell과 EntryAnnouncementPopup에
 * 나눠주는 공유 데이터. 전에는 두 컴포넌트가 각자 team_membership, 공지,
 * 중요 알림 후보들을 독립적으로(그것도 거의 똑같이) 조회하고 있어서,
 * PageHeader가 모든 화면에 떠 있는 탓에 페이지를 옮길 때마다 거의 같은
 * 쿼리가 두 번씩 나가고 있었다 — "화면 전환이 느리다" 피드백의 원인.
 * 여기서 한 번만 계산해서 둘 다에게 내려준다.
 *
 * 공지/중요 알림(announcements, importantNotifications)은 마운트 시
 * 한 번만 조회한다 — PageHeader 자체가 페이지마다 새로 마운트되니
 * 결과적으로 "페이지를 옮길 때마다 다시 확인"은 그대로 유지된다. 안읽은
 * 일반 알림 개수(genericUnreadCount)만 refreshGenericCount로 다시 셀 수
 * 있게 했다 — 알림 시트에서 읽음 처리한 직후 벨 뱃지가 바로 줄어들어야
 * 하기 때문.
 */
export function useNotificationData() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [importantNotifications, setImportantNotifications] = useState<ImportantNotification[]>([]);
  const [genericUnreadCount, setGenericUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [genericRefreshKey, setGenericRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const [{ data: profile }, { data: membership }] = await Promise.all([
        supabase
          .from("profiles")
          .select("last_seen_announcement_at, auto_renew_preference")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("team_memberships")
          .select("team_id, role")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (cancelled || !membership) return;

      let announcementsQuery = supabase
        .from("announcements")
        .select("id, body")
        .eq("team_id", membership.team_id)
        .order("created_at", { ascending: true });
      if (profile?.last_seen_announcement_at) {
        announcementsQuery = announcementsQuery.gt("created_at", profile.last_seen_announcement_at);
      }

      const isAdmin = membership.role === "admin";

      const [
        { data: unseenAnnouncements },
        { data: rejectedNotifs },
        { data: renewalCandidates },
        pendingReviews,
        pendingSettlements,
      ] = await Promise.all([
        announcementsQuery,
        supabase
          .from("notifications")
          .select("id, activities(rejected_reason)")
          .eq("user_id", user.id)
          .eq("type", "activity_rejected")
          .is("read_at", null)
          .returns<{ id: string; activities: { rejected_reason: string | null } | null }[]>(),
        supabase
          .from("season_memberships")
          .select("season_id, seasons(start_date, end_date, settled_at)")
          .eq("user_id", user.id)
          .is("renew_next_season", null)
          .returns<
            {
              season_id: string;
              seasons: { start_date: string; end_date: string; settled_at: string | null } | null;
            }[]
          >(),
        // team_id 필터가 없는 건 실수가 아니다 — "team members can view
        // review requests in their team" RLS가 이미 본인 팀으로만
        // 걸러준다(admin/review 페이지와 동일한 패턴).
        isAdmin
          ? supabase
              .from("activity_review_requests")
              .select("id, profiles!requested_by(name)")
              .eq("status", "pending")
              .returns<{ id: string; profiles: { name: string } | null }[]>()
          : Promise.resolve({ data: [] as { id: string; profiles: { name: string } | null }[] }),
        isAdmin
          ? supabase
              .from("seasons")
              .select("id")
              .eq("team_id", membership.team_id)
              .not("settlement_notified_at", "is", null)
              .is("settled_at", null)
          : Promise.resolve({ data: [] as { id: string }[] }),
      ]);

      // 시즌이 아직 안 끝났고(settled_at is null) 마지막 주에 들어섰을
      // 때만 "조치가 필요"하다 — 시즌 중간에 답을 안 한 건 급할 게 없다.
      const today = todayInSeoul();
      const renewalNeedingAction = (renewalCandidates ?? []).filter((c) => {
        const season = c.seasons;
        if (!season || season.settled_at) return false;
        const lastWeekIndex = seasonWeekIndexForDate(season.start_date, season.end_date);
        if (lastWeekIndex === null) return false;
        const lastWeekStart = seasonWeekRange(season.start_date, lastWeekIndex).start;
        return today >= lastWeekStart;
      });

      // "매 시즌 물어보지 않고 계속 참여"를 켜둔 사람은 물어볼 것 없이
      // 바로 연장으로 채워준다 — 중요 알림에도 안 띄운다.
      const autoRenewOn = profile?.auto_renew_preference === true;
      const renewalToShow = autoRenewOn ? [] : renewalNeedingAction;
      if (autoRenewOn && renewalNeedingAction.length > 0) {
        await Promise.all(
          renewalNeedingAction.map((c) =>
            supabase
              .from("season_memberships")
              .update({ renew_next_season: true })
              .eq("season_id", c.season_id)
              .eq("user_id", user.id),
          ),
        );
      }

      const importantList: ImportantNotification[] = [
        ...(rejectedNotifs ?? []).map((n) => {
          const reason = n.activities?.rejected_reason;
          return {
            id: n.id,
            body: `인증이 반려됐어요${reason ? ` (사유: ${reason})` : ""}. 새로 업로드해주세요.`,
            href: "/certify",
          };
        }),
        ...renewalToShow.map((c) => ({
          id: c.season_id,
          body: "다음 시즌 연장 여부를 아직 안 정했어요. 연장하면 이번 시즌 참가비가 다음 시즌 참가비로 이월돼요.",
          href: "/mypage",
          hint: {
            text: "매번 정하기 번거로우면, 설정에서 앞으로 시즌마다 자동으로 계속 참여하도록 미리 켜둘 수 있어요",
            href: "/mypage",
          },
        })),
        ...(pendingReviews.data ?? []).map((r) => ({
          id: r.id,
          body: `${r.profiles?.name ?? "누군가"}님이 재인증을 요청했어요. 확인해주세요!`,
          href: "/admin/review",
        })),
        ...(pendingSettlements.data ?? []).map((s) => ({
          id: s.id,
          body: "그레이스 기간이 끝났는데 처리할 요청이 남아있어서 시즌이 자동으로 정산되지 않았어요. 확인해주세요!",
          href: `/admin/season/${s.id}`,
        })),
      ];

      if (cancelled) return;
      const confirmedIds = getConfirmedAnnouncementIds();
      setAnnouncements((unseenAnnouncements ?? []).filter((a) => !confirmedIds.has(a.id)));
      setImportantNotifications(importantList);
      setUserId(user.id);
      setIsReady(true);
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function loadGenericCount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("type", ["comment", "reply", "reaction"])
        .is("read_at", null);

      if (!cancelled) setGenericUnreadCount(count ?? 0);
    }

    loadGenericCount();
    return () => {
      cancelled = true;
    };
  }, [genericRefreshKey]);

  function markAnnouncementsSeen() {
    if (announcements.length === 0 || !userId) return;
    addConfirmedAnnouncementIds(announcements.map((a) => a.id));
    const supabase = createClient();
    supabase
      .from("profiles")
      .update({ last_seen_announcement_at: new Date().toISOString() })
      .eq("id", userId)
      .then(({ error }) => {
        if (error) console.error("[announcements] mark-seen failed:", error.message);
      });
  }

  return {
    announcements,
    importantNotifications,
    genericUnreadCount,
    isReady,
    markAnnouncementsSeen,
    refreshGenericCount: () => setGenericRefreshKey((k) => k + 1),
  };
}
