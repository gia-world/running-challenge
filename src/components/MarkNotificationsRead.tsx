"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/** 알림 목록 화면에 들어오면 안읽은 알림을 전부 읽음 처리한다 — 보이는 UI는 없다. */
export function MarkNotificationsRead({ userId }: { userId: string }) {
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null)
      .then(({ error }) => {
        if (error) console.error("[notifications] mark-read failed:", error.message);
      });
  }, [userId]);

  return null;
}
