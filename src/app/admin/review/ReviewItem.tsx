"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ReviewItem({ activityId }: { activityId: string }) {
  const router = useRouter();
  const [isShowingReject, setIsShowingReject] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setIsSubmitting(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from("activities")
      .update({ status: "approved", reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq("id", activityId);

    if (updateError) {
      setError("처리에 실패했어요. 다시 시도해주세요.");
      setIsSubmitting(false);
      return;
    }
    router.refresh();
  }

  async function reject() {
    if (!reason.trim()) {
      setError("불인정 사유를 입력해주세요.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from("activities")
      .update({
        status: "rejected",
        rejected_reason: reason.trim(),
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", activityId);

    if (updateError) {
      setError("처리에 실패했어요. 다시 시도해주세요.");
      setIsSubmitting(false);
      return;
    }
    router.refresh();
  }

  if (isShowingReject) {
    return (
      <div className="mt-3 flex flex-col gap-2">
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="불인정 사유 (예: 날짜가 안 보여요)"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reject}
            disabled={isSubmitting}
            className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            불인정 확정
          </button>
          <button
            type="button"
            onClick={() => {
              setIsShowingReject(false);
              setError(null);
            }}
            disabled={isSubmitting}
            className="flex-1 rounded-lg bg-zinc-200 py-2 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={approve}
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-orange-500 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          인정
        </button>
        <button
          type="button"
          onClick={() => setIsShowingReject(true)}
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-zinc-200 py-2 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          불인정
        </button>
      </div>
    </div>
  );
}
