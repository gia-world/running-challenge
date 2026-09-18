"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const REJECT_REASONS = [
  "날짜가 안 보여요",
  "거리가 안 보여요",
  "페이스가 안 보여요",
  "본인 기록인지 확인이 안 돼요",
] as const;

export function ReviewItem({ activityId }: { activityId: string }) {
  const router = useRouter();
  const [isShowingReject, setIsShowingReject] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolveReviewRequests(adminId: string | undefined) {
    const supabase = createClient();
    await supabase
      .from("activity_review_requests")
      .update({
        status: "resolved",
        resolved_by: adminId,
        resolved_at: new Date().toISOString(),
      })
      .eq("activity_id", activityId)
      .eq("status", "pending");
  }

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
    await resolveReviewRequests(user?.id);
    router.refresh();
  }

  async function reject() {
    if (!reason.trim()) {
      setError("반려 사유를 입력해주세요.");
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
    await resolveReviewRequests(user?.id);

    // Best-effort — a missed KakaoTalk notification shouldn't affect the
    // rejection itself, which already succeeded above.
    fetch("/api/notify/activity-rejected", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityId }),
    }).catch((err) => console.error("[admin/review] notify activity-rejected failed:", err));

    router.refresh();
  }

  if (isShowingReject) {
    return (
      <div className="mt-3 flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          {REJECT_REASONS.map((presetReason) => (
            <button
              key={presetReason}
              type="button"
              onClick={() => setReason(presetReason)}
              disabled={isSubmitting}
              className={
                reason === presetReason
                  ? "rounded-full bg-red-500 px-3 py-1.5 text-sm font-medium text-white"
                  : "rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              }
            >
              {presetReason}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="반려 사유 (직접 입력도 가능해요)"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reject}
            disabled={isSubmitting}
            className="flex-1 rounded-lg bg-red-500 py-2 text-base font-semibold text-white disabled:opacity-60"
          >
            반려 확정
          </button>
          <button
            type="button"
            onClick={() => {
              setIsShowingReject(false);
              setError(null);
            }}
            disabled={isSubmitting}
            className="flex-1 rounded-lg bg-zinc-200 py-2 text-base font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={approve}
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-orange-500 py-2 text-base font-semibold text-white disabled:opacity-60"
        >
          인정 유지
        </button>
        <button
          type="button"
          onClick={() => setIsShowingReject(true)}
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-zinc-200 py-2 text-base font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          반려
        </button>
      </div>
    </div>
  );
}
