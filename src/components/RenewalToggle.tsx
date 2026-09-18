"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
      <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-zinc-900">
        <span className="text-base text-zinc-500 dark:text-zinc-400">
          {choice
            ? "다음 시즌 연장 선택 — 환급액이 다음 시즌 참가비로 이월돼요."
            : "연장 안 함 — 환급액을 그대로 받아요."}
        </span>
        <button
          type="button"
          onClick={() => setChoice(null)}
          disabled={isSubmitting}
          className="shrink-0 text-sm font-medium text-orange-500"
        >
          변경
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900">
      <p className="text-base text-zinc-500 dark:text-zinc-400">
        다음 시즌도 계속하시겠어요? 연장하면 이번 시즌 환급액은 다음 시즌
        참가비로 자동 이월돼요.
      </p>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setRenewal(true)}
          disabled={isSubmitting}
          className="flex-1 rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          연장할게요
        </button>
        <button
          type="button"
          onClick={() => setRenewal(false)}
          disabled={isSubmitting}
          className="flex-1 rounded-xl bg-zinc-200 px-4 py-3 font-semibold text-zinc-700 disabled:opacity-60 dark:bg-zinc-800 dark:text-zinc-300"
        >
          환급 받을게요
        </button>
      </div>
    </div>
  );
}
