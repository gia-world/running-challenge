"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

const SESSION_FLAG = "entryPopupShown";

type Announcement = { id: string; body: string };
type ImportantNotification = { id: string; body: string };

/**
 * 입장 시 제일 먼저 보여주는 센터 모달 — (1) 아직 못 본 관리자 공지와
 * (2) 안읽은 개인 알림 개수 요약을 한 번에 보여준다. 공지는
 * profiles.last_seen_announcement_at으로 "진짜 처음 보는지"를 서버 상태로
 * 판단하지만(그래서 새 공지가 생기면 세션이 바뀌어도 다시 뜸), 알림 개수
 * 요약은 매번 뜨면 거슬려서 세션당 한 번만 보여준다(sessionStorage).
 * NotificationBell과 같은 이유로 자체적으로 로그인 사용자를 알아낸다.
 *
 * 바텀시트가 아니라 PhotoViewerModal과 같은 센터 모달 톤(bg-black/60 +
 * 가운데 rounded-2xl 카드)을 썼다 — 자동연장 바텀시트를 배경 탭으로
 * 무심코 닫아버려 안 읽고 넘어간 사람들이 있었던 전례가 있어서, 배경
 * 탭으로는 안 닫히게 하고 "확인" 버튼을 직접 눌러야만 닫히게 했다.
 * 공지는 한 번 닫으면 다시 안 뜨는 "놓치면 끝" 구조라 더 신중하게
 * 만들었다.
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
        supabase.from("profiles").select("last_seen_announcement_at").eq("id", user.id).maybeSingle(),
        supabase.from("team_memberships").select("team_id").eq("user_id", user.id).maybeSingle(),
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
      const { data: unseenAnnouncements } = await announcementsQuery;

      let notifCount = 0;
      let importantList: ImportantNotification[] = [];
      if (typeof window !== "undefined" && !window.sessionStorage.getItem(SESSION_FLAG)) {
        // 재인증 요청/인증 반려/정산 보류처럼 중요한 알림은 공지처럼 본문을
        // 그대로 보여주고, 나머지(댓글/대댓글/이모지)만 "N개 보기" 요약
        // 카운트에 넣는다.
        const IMPORTANT_TYPES = ["review_request", "activity_rejected", "settlement_pending"];
        const [{ data: important }, { count }] = await Promise.all([
          supabase
            .from("notifications")
            .select("id, type, profiles!actor_user_id(name), activities(rejected_reason)")
            .eq("user_id", user.id)
            .in("type", IMPORTANT_TYPES)
            .is("read_at", null)
            .returns<
              {
                id: string;
                type: string;
                profiles: { name: string } | null;
                activities: { rejected_reason: string | null } | null;
              }[]
            >(),
          supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .not("type", "in", `(${IMPORTANT_TYPES.join(",")})`)
            .is("read_at", null),
        ]);
        importantList = (important ?? []).map((n) => {
          if (n.type === "activity_rejected") {
            const reason = n.activities?.rejected_reason;
            return {
              id: n.id,
              body: `인증이 반려됐어요${reason ? ` (사유: ${reason})` : ""}. 새로 업로드해주세요.`,
            };
          }
          if (n.type === "settlement_pending") {
            return {
              id: n.id,
              body: "그레이스 기간이 끝났는데 처리할 요청이 남아있어서 시즌이 자동으로 정산되지 않았어요. 확인해주세요!",
            };
          }
          return { id: n.id, body: `${n.profiles?.name ?? "누군가"}님이 재인증을 요청했어요` };
        });
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
              <p key={n.id} className="text-base text-ink">
                {n.body}
              </p>
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
