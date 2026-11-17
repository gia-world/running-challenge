"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";
import { seasonWeekIndexForDate, seasonWeekRange } from "@/lib/season";
import { todayInSeoul } from "@/lib/week";

const SESSION_FLAG = "entryPopupShown";

type Announcement = { id: string; body: string };
type ImportantNotification = {
  id: string;
  body: string;
  href: string;
  /** 재인증 요청/정산 보류처럼 명확한 단일 액션이 아니라, 추가로 안내할
   * 게 있을 때만(지금은 자동연장 미응답 → 설정 안내) 쓰는 보조 줄. */
  hint?: { text: string; href: string };
};

/**
 * 입장 시 제일 먼저 보여주는 센터 모달 — (1) 아직 못 본 관리자 공지,
 * (2) 실제로 조치해야 하는 중요 알림(재인증 요청/인증 반려/정산 보류),
 * (3) 안읽은 일반 알림(댓글/대댓글/이모지) 개수 요약을 한 번에 보여준다.
 *
 * 공지는 profiles.last_seen_announcement_at으로 "진짜 처음 보는지"를
 * 서버 상태로 판단한다. 중요 알림은 notifications.read_at이 아니라 —
 * "확인"을 눌렀다고 실제 조치를 한 건 아니므로 — 매번 그 자리에서 실제로
 * 아직 해결 안 됐는지를 직접 조회해서, 조치할 때까지 계속 뜨게 한다
 * (재인증 요청은 activity_review_requests.status='pending', 정산 보류는
 * seasons.settled_at is null, 자동연장 응답은
 * season_memberships.renew_next_season is null — 전부 조치하면 저절로
 * 사라짐). 유일하게 activity_rejected만 notifications.read_at을 쓰는데,
 * 이건 "확인"이 아니라 CertifyForm에서 같은 날짜로 재업로드할 때 읽음
 * 처리된다. profiles.auto_renew_preference를 켜둔 사람은 자동연장
 * 알림 자체가 안 뜨고, 대신 이 자리에서 바로 renew_next_season을
 * true로 채워버린다(마이페이지 "계속 참여" 설정 참고). 일반 알림
 * 요약만 매번 뜨면 거슬려서 세션당 한 번으로 제한한다(sessionStorage).
 * NotificationBell과 같은 이유로 자체적으로 로그인 사용자를 알아낸다.
 *
 * 바텀시트가 아니라 PhotoViewerModal과 같은 센터 모달 톤(bg-black/60 +
 * 가운데 rounded-2xl 카드)을 썼다 — 자동연장 바텀시트를 배경 탭으로
 * 무심코 닫아버려 안 읽고 넘어간 사람들이 있었던 전례가 있어서, 배경
 * 탭으로는 안 닫히게 하고 "확인" 버튼을 직접 눌러야만 닫히게 했다.
 */
export function EntryAnnouncementPopup() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [importantNotifications, setImportantNotifications] = useState<ImportantNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

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
        supabase.from("team_memberships").select("team_id, role").eq("user_id", user.id).maybeSingle(),
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
          body: "다음 시즌 연장 여부를 아직 안 정했어요. 연장하면 이번 시즌 환급액이 다음 시즌 참가비로 이월돼요.",
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

      let notifCount = 0;
      if (typeof window !== "undefined" && !window.sessionStorage.getItem(SESSION_FLAG)) {
        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("type", ["comment", "reply", "reaction"])
          .is("read_at", null);
        notifCount = count ?? 0;
      }

      if (cancelled) return;
      const announcementList = unseenAnnouncements ?? [];
      if (announcementList.length > 0 || importantList.length > 0 || notifCount > 0) {
        setAnnouncements(announcementList);
        setImportantNotifications(importantList);
        setUnreadCount(notifCount);
        setUserId(user.id);
        setIsOpen(true);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleClose() {
    window.sessionStorage.setItem(SESSION_FLAG, "1");
    if (announcements.length > 0 && userId) {
      const supabase = createClient();
      supabase
        .from("profiles")
        .update({ last_seen_announcement_at: new Date().toISOString() })
        .eq("id", userId)
        .then(({ error }) => {
          if (error) console.error("[announcements] mark-seen failed:", error.message);
        });
    }
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

        {unreadCount > 0 && (
          <Link
            href="/notifications"
            onClick={handleClose}
            className="text-base font-medium text-primary underline"
          >
            읽지 않은 알림 {unreadCount}개 보기 →
          </Link>
        )}

        <Button onClick={handleClose}>확인</Button>
      </div>
    </div>
  );
}
