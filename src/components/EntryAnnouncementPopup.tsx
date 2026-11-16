"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

const SESSION_FLAG = "entryPopupShown";

type Announcement = { id: string; body: string };

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
      if (typeof window !== "undefined" && !window.sessionStorage.getItem(SESSION_FLAG)) {
        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("read_at", null);
        notifCount = count ?? 0;
      }

      if (cancelled) return;
      const announcementList = unseenAnnouncements ?? [];
      if (announcementList.length > 0 || notifCount > 0) {
        setAnnouncements(announcementList);
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

        {unreadCount > 0 && (
          <Link
            href="/notifications"
            onClick={handleClose}
            className={
              announcements.length > 0
                ? "border-t border-border-subtle pt-3 text-base font-medium text-primary"
                : "text-base font-medium text-primary"
            }
          >
            읽지 않은 알림이 {unreadCount}개 있어요 →
          </Link>
        )}

        <Button onClick={handleClose}>확인</Button>
      </div>
    </div>
  );
}
