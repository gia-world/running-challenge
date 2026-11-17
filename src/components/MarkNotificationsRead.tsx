"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * 알림 목록 화면에 들어오면 댓글/대댓글/이모지 알림을 읽음 처리한다 —
 * 보이는 UI는 없다. 재인증 요청/인증 반려/정산 보류는 일부러 빼뒀다 —
 * 이 목록을 한 번 봤다고 그 일이 실제로 해결된 건 아니라서, 여기서
 * 읽음 처리하면 입장 팝업의 "중요 알림"이 실제 조치 전에 사라지는
 * 꼴이 된다(EntryAnnouncementPopup 참고).
 */
export function MarkNotificationsRead({ userId }: { userId: string }) {
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .in("type", ["comment", "reply", "reaction"])
      .is("read_at", null)
      .then(({ error }) => {
        if (error) console.error("[notifications] mark-read failed:", error.message);
      });
  }, [userId]);

  return null;
}
