"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SeasonFeeForm({
  seasonId,
  initialEntryFee,
  initialRefundPerCertification,
}: {
  seasonId: string;
  initialEntryFee: number | null;
  initialRefundPerCertification: number | null;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(initialEntryFee == null && initialRefundPerCertification == null);
  const [entryFee, setEntryFee] = useState(initialEntryFee?.toString() ?? "");
  const [refundPerCertification, setRefundPerCertification] = useState(
    initialRefundPerCertification?.toString() ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("seasons")
      .update({
        entry_fee: entryFee ? Number(entryFee) : null,
        refund_per_certification: refundPerCertification ? Number(refundPerCertification) : null,
      })
      .eq("id", seasonId);

    if (updateError) {
      setError("저장에 실패했어요. 다시 시도해주세요.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setIsEditing(false);
    router.refresh();
  }

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-zinc-900">
        <span className="text-base text-zinc-500 dark:text-zinc-400">
          참가비 {initialEntryFee?.toLocaleString("ko-KR")}원 · 인증 1회당{" "}
          {initialRefundPerCertification?.toLocaleString("ko-KR")}원 환급
        </span>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="shrink-0 text-sm font-medium text-orange-500"
        >
          수정
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900"
    >
      <label className="flex flex-col gap-1">
        <span className="text-base text-zinc-500 dark:text-zinc-400">참가비 (원)</span>
        <input
          type="number"
          min="0"
          step="1000"
          inputMode="numeric"
          value={entryFee}
          onChange={(e) => setEntryFee(e.target.value)}
          placeholder="24000"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-base text-zinc-500 dark:text-zinc-400">인증 1회당 환급 단가 (원)</span>
        <input
          type="number"
          min="0"
          step="500"
          inputMode="numeric"
          value={refundPerCertification}
          onChange={(e) => setRefundPerCertification(e.target.value)}
          placeholder="2000"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-orange-500 px-5 py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "저장 중..." : "저장하기"}
      </button>
    </form>
  );
}
