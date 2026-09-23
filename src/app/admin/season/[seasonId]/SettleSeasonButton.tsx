"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

export function SettleSeasonButton({
  seasonId,
  hasPendingReviewRequests,
  hasPendingDropoutRequests,
  isInGracePeriod,
}: {
  seasonId: string;
  hasPendingReviewRequests: boolean;
  /** A pending dropout request falls out of admin/dropout's own queue once the season is settled, so it'd otherwise get stuck with no way to resolve it. */
  hasPendingDropoutRequests: boolean;
  /** Certifications can still land (or get deleted) until noon the day after end_date, so settling now could lock in numbers that are about to change. */
  isInGracePeriod: boolean;
}) {
  const router = useRouter();
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const warnings = [
    hasPendingReviewRequests && "재인증 요청 신청/처리가 모두 막혀요.",
    hasPendingDropoutRequests && "대기 중인 중도하차 요청은 더 이상 처리할 수 없게 돼요.",
    isInGracePeriod && "그레이스 기간(오늘 정오까지)이 끝나기 전이라 정산 금액이 아직 바뀔 수 있어요.",
  ].filter((w): w is string => !!w);

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
    if (warnings.length > 0 && !needsConfirm) {
      setNeedsConfirm(true);
      return;
    }
    settle();
  }

  return (
    <div className="flex flex-col gap-2">
      {needsConfirm && (
        <div className="flex flex-col gap-1 rounded-lg bg-warning-subtle px-3 py-2 text-base text-warning">
          <span>정산완료 처리하면:</span>
          <ul className="list-disc pl-5">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
          <span>그래도 계속할까요?</span>
        </div>
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
