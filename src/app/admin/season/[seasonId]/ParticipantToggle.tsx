"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ParticipantToggle({
  seasonId,
  userId,
  initialIsParticipant,
}: {
  seasonId: string;
  userId: string;
  initialIsParticipant: boolean;
}) {
  const router = useRouter();
  const [isParticipant, setIsParticipant] = useState(initialIsParticipant);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function toggle() {
    setIsSubmitting(true);
    const supabase = createClient();

    if (isParticipant) {
      await supabase
        .from("season_memberships")
        .delete()
        .eq("season_id", seasonId)
        .eq("user_id", userId);
    } else {
      await supabase.from("season_memberships").insert({ season_id: seasonId, user_id: userId });
    }

    setIsParticipant(!isParticipant);
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isSubmitting}
      className={
        isParticipant
          ? "shrink-0 rounded-xl bg-muted-strong px-3 py-2 text-base font-medium text-ink disabled:opacity-60"
          : "shrink-0 rounded-xl bg-primary px-3 py-2 text-base font-semibold text-white disabled:opacity-60"
      }
    >
      {isParticipant ? "참여 취소" : "참여 추가"}
    </button>
  );
}
