"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

export function SettleSeasonButton({
  seasonId,
  hasPendingReviewRequests,
}: {
  seasonId: string;
  hasPendingReviewRequests: boolean;
}) {
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
    if (hasPendingReviewRequests && !needsConfirm) {
      setNeedsConfirm(true);
      return;
    }
    settle();
  }

  return (
    <div className="flex flex-col gap-2">
      {needsConfirm && (
        <p className="rounded-lg bg-warning-subtle px-3 py-2 text-base text-warning">
          정산완료 처리하면 재인증 요청 신청/처리가 모두 막혀요. 계속할까요?
        </p>
      )}
      {error && (
        <p className="text-sm text-danger">{error}</p>
      )}
      <Button variant="inverse" size="auto" onClick={handleClick} disabled={isSubmitting}>
        {isSubmitting
          ? "처리 중..."
          : needsConfirm
            ? "그래도 정산완료"
            : "정산완료"}
      </Button>
    </div>
  );
}
