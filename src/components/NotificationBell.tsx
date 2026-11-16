"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * 헤더의 알림 벨 — 서버에서 currentUserId를 내려받지 않고 브라우저
 * 세션으로 스스로 "내가 누구인지" 알아내서 안읽은 알림 개수만 가져온다.
 * PageShell/PageHeader 시그니처를 안 건드리려고 일부러 이렇게 뺐다.
 */
export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function loadCount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null);

      if (!cancelled) setUnreadCount(count ?? 0);
    }

    loadCount();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link
      href="/notifications"
      aria-label="알림"
      className="relative flex h-8 w-8 items-center justify-center rounded-full text-xl text-ink hover:bg-muted"
    >
      🔔
      {unreadCount > 0 && (
        <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-sm font-semibold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
