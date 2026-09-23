"use client";

import { Input } from "./Input";
import { Toggle } from "./Toggle";
import { deriveEntryFee, deriveRefundPerCertification } from "@/lib/settlement";

export const DEFAULT_ENTRY_FEE = "24000";
export const DEFAULT_REFUND_PER_CERTIFICATION = "2000";

/**
 * 참가비/환급단가 입력 — 시즌 만들기와 시즌 상세의 "수정" 둘 다 이 컴포넌트를
 * 쓴다. 정산 기능 자체를 켜고 끄는 토글이 앞에 있고(꺼져 있으면 두 값 다
 * null로 저장돼야 하는 게 호출부 책임), 켜져 있을 땐 둘 중 하나를 입력하면
 * "완주하면 참가비를 전액 환급받는다"는 관계(참가비 = 단가 × WEEKLY_GOAL ×
 * 주차 수)로 나머지가 실시간 제안값으로 채워진다. 계산된 값도 그냥 평범한
 * input이라 admin이 그대로 덮어쓸 수 있다 — 예를 들어 환급 안 되는 기본금이
 * 섞인 참가비를 원하면 단가는 그대로 두고 참가비만 따로 조정하면 된다.
 */
export function SeasonFeeFields({
  enabled,
  onEnabledChange,
  entryFee,
  onEntryFeeChange,
  refundPerCertification,
  onRefundPerCertificationChange,
  weekCount,
}: {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  entryFee: string;
  onEntryFeeChange: (value: string) => void;
  refundPerCertification: string;
  onRefundPerCertificationChange: (value: string) => void;
  /** 시즌 길이(주) — 두 필드를 서로 계산해줄 때 쓰는 배수. */
  weekCount: number;
}) {
  function handleEntryFeeChange(value: string) {
    onEntryFeeChange(value);
    const amount = Number(value);
    if (value.trim() && !Number.isNaN(amount) && amount >= 0) {
      onRefundPerCertificationChange(String(deriveRefundPerCertification(amount, weekCount)));
    }
  }

  function handleRefundChange(value: string) {
    onRefundPerCertificationChange(value);
    const amount = Number(value);
    if (value.trim() && !Number.isNaN(amount) && amount >= 0) {
      onEntryFeeChange(String(deriveEntryFee(amount, weekCount)));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Toggle checked={enabled} onChange={onEnabledChange}>
        정산 기능 사용
      </Toggle>

      {enabled && (
        <>
          <Input
            type="number"
            min="0"
            step="1000"
            inputMode="numeric"
            label="참가비 (원)"
            value={entryFee}
            onChange={(e) => handleEntryFeeChange(e.target.value)}
            placeholder={DEFAULT_ENTRY_FEE}
          />

          <Input
            type="number"
            min="0"
            step="500"
            inputMode="numeric"
            label="인증 1회당 환급 단가 (원)"
            value={refundPerCertification}
            onChange={(e) => handleRefundChange(e.target.value)}
            placeholder={DEFAULT_REFUND_PER_CERTIFICATION}
          />
        </>
      )}
    </div>
  );
}
