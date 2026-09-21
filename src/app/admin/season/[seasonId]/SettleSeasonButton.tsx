"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SettleSeasonButton({ seasonId }: { seasonId: string }) {
  const router = useRouter();
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function settle() {
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("seasons")
      .update({ settled_at: new Date().toISOString() })
      .eq("id", seasonId);

    if (updateError) {
      setError("처리에 실패했어요. 다시 시도해주세요.");
      setIsSubmitting(false);
      return;
    }

    router.refresh();
  }

  function handleClick() {
    if (!needsConfirm) {
      setNeedsConfirm(true);
      return;
    }
    settle();
  }

  return (
    <div className="flex flex-col gap-2">
      {needsConfirm && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-base text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          정산완료 처리하면 참여자 변경과 재인증 요청 신청/처리가 모두
          막혀요. 계속할까요?
        </p>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="button"
        onClick={handleClick}
        disabled={isSubmitting}
        className="rounded-xl bg-zinc-900 px-5 py-3 font-semibold text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {isSubmitting ? "처리 중..." : needsConfirm ? "그래도 정산완료" : "정산완료"}
      </button>
    </div>
  );
}
