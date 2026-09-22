"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

export function RenewalToggle({
  seasonId,
  userId,
  initialChoice,
  onAnswered,
}: {
  seasonId: string;
  userId: string;
  initialChoice: boolean | null;
  onAnswered?: () => void;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState(initialChoice);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setRenewal(value: boolean) {
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("season_memberships")
      .update({ renew_next_season: value })
      .eq("season_id", seasonId)
      .eq("user_id", userId);

    if (updateError) {
      setError("저장에 실패했어요. 다시 시도해주세요.");
      setIsSubmitting(false);
      return;
    }

    setChoice(value);
    setIsSubmitting(false);
    router.refresh();
    onAnswered?.();
  }

  if (choice !== null) {
    return (
      <div className="flex items-center justify-between gap-4">
        <span className="text-base text-ink">
          {choice ? (
            <>
              <span>다음 시즌 연장 선택 완료</span>
              <br />
              <span className="text-sm text-ink-secondary">
                상금을 제외한 환급액이 다음 시즌 참가비로 이월돼요.
              </span>
            </>
          ) : (
            "연장 안 함 — 환급액을 그대로 받아요."
          )}
        </span>
        <Button size="pill" onClick={() => setChoice(null)} disabled={isSubmitting}>
          변경
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-base text-ink-secondary">
        다음 시즌도 계속하시나요? 연장하면 이번 시즌 환급액은 다음 시즌
        참가비로 자동 이월돼요.
      </p>
      {error && (
        <p className="text-sm text-danger">{error}</p>
      )}
      <div className="flex gap-2">
        <Button size="auto" className="flex-1" onClick={() => setRenewal(true)} disabled={isSubmitting}>
          연장할게요
        </Button>
        <Button
          variant="secondary"
          size="auto"
          className="flex-1"
          onClick={() => setRenewal(false)}
          disabled={isSubmitting}
        >
          환급 받을게요
        </Button>
      </div>
    </div>
  );
}
