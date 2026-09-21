"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  SeasonFeeFields,
  DEFAULT_ENTRY_FEE,
  DEFAULT_REFUND_PER_CERTIFICATION,
} from "@/components/SeasonFeeFields";

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
  const [entryFee, setEntryFee] = useState(initialEntryFee?.toString() ?? DEFAULT_ENTRY_FEE);
  const [refundPerCertification, setRefundPerCertification] = useState(
    initialRefundPerCertification?.toString() ?? DEFAULT_REFUND_PER_CERTIFICATION,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const entryFeeValue = Number(entryFee);
    const refundValue = Number(refundPerCertification);
    if (!entryFee || !refundPerCertification || entryFeeValue <= 0 || refundValue <= 0) {
      setError("참가비와 환급 단가를 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("seasons")
      .update({
        entry_fee: entryFeeValue,
        refund_per_certification: refundValue,
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
      <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
        <span className="text-base text-ink-secondary">
          참가비 {initialEntryFee?.toLocaleString("ko-KR")}원 · 인증 1회당{" "}
          {initialRefundPerCertification?.toLocaleString("ko-KR")}원 환급
        </span>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="shrink-0 text-sm font-medium text-primary"
        >
          수정
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
    >
      <SeasonFeeFields
        entryFee={entryFee}
        onEntryFeeChange={setEntryFee}
        refundPerCertification={refundPerCertification}
        onRefundPerCertificationChange={setRefundPerCertification}
        required
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "저장 중..." : "저장하기"}
      </button>
    </form>
  );
}
