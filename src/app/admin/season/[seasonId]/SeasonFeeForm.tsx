"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  SeasonFeeFields,
  DEFAULT_ENTRY_FEE,
  DEFAULT_REFUND_PER_CERTIFICATION,
} from "@/components/SeasonFeeFields";
import { seasonWeekCount } from "@/lib/season";
import { Button } from "@/components/Button";

export function SeasonFeeForm({
  seasonId,
  seasonStartDate,
  seasonEndDate,
  initialEntryFee,
  initialRefundPerCertification,
  readOnly = false,
}: {
  seasonId: string;
  seasonStartDate: string;
  seasonEndDate: string;
  initialEntryFee: number | null;
  initialRefundPerCertification: number | null;
  /** 시즌 종료(정산 완료) 후에는 이미 정산에 쓰인 금액이 바뀌면 안 되므로 수정 버튼 자체를 숨긴다. */
  readOnly?: boolean;
}) {
  const router = useRouter();
  const hasFees = initialEntryFee != null && initialRefundPerCertification != null;
  const [isEditing, setIsEditing] = useState(!readOnly && !hasFees);
  const [feeEnabled, setFeeEnabled] = useState(hasFees);
  const [entryFee, setEntryFee] = useState(initialEntryFee?.toString() ?? DEFAULT_ENTRY_FEE);
  const [refundPerCertification, setRefundPerCertification] = useState(
    initialRefundPerCertification?.toString() ?? DEFAULT_REFUND_PER_CERTIFICATION,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const weekCount = seasonWeekCount(seasonStartDate, seasonEndDate);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (feeEnabled) {
      const entryFeeValue = Number(entryFee);
      const refundValue = Number(refundPerCertification);
      if (!entryFee || !refundPerCertification || entryFeeValue <= 0 || refundValue <= 0) {
        setError("참가비와 환급 단가를 모두 입력하거나, 정산 기능을 꺼주세요.");
        return;
      }
    }

    setIsSubmitting(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("seasons")
      .update({
        entry_fee: feeEnabled ? Number(entryFee) : null,
        refund_per_certification: feeEnabled ? Number(refundPerCertification) : null,
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
          {hasFees
            ? `참가비 ${initialEntryFee!.toLocaleString("ko-KR")}원 · 인증 1회당 ${initialRefundPerCertification!.toLocaleString("ko-KR")}원 환급`
            : "정산 기능을 사용하지 않아요."}
        </span>
        {!readOnly && (
          <Button size="pill" onClick={() => setIsEditing(true)}>
            수정
          </Button>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface px-4 py-3"
    >
      <SeasonFeeFields
        enabled={feeEnabled}
        onEnabledChange={setFeeEnabled}
        entryFee={entryFee}
        onEntryFeeChange={setEntryFee}
        refundPerCertification={refundPerCertification}
        onRefundPerCertificationChange={setRefundPerCertification}
        weekCount={weekCount}
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "저장 중..." : "저장하기"}
      </Button>
    </form>
  );
}
