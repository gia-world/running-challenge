"use client";

import { Input } from "./Input";

export const DEFAULT_ENTRY_FEE = "24000";
export const DEFAULT_REFUND_PER_CERTIFICATION = "2000";

export function SeasonFeeFields({
  entryFee,
  onEntryFeeChange,
  refundPerCertification,
  onRefundPerCertificationChange,
  required = false,
}: {
  entryFee: string;
  onEntryFeeChange: (value: string) => void;
  refundPerCertification: string;
  onRefundPerCertificationChange: (value: string) => void;
  /** Whether these fields are mandatory in this form (affects label wording only — validation stays with the caller). */
  required?: boolean;
}) {
  return (
    <>
      <Input
        type="number"
        min="0"
        step="1000"
        inputMode="numeric"
        label={`참가비 ${required ? "(원)" : "(원, 선택)"}`}
        value={entryFee}
        onChange={(e) => onEntryFeeChange(e.target.value)}
        placeholder={DEFAULT_ENTRY_FEE}
        className="px-3 py-2.5 text-sm"
      />

      <Input
        type="number"
        min="0"
        step="500"
        inputMode="numeric"
        label={`인증 1회당 환급 단가 ${required ? "(원)" : "(원, 선택)"}`}
        value={refundPerCertification}
        onChange={(e) => onRefundPerCertificationChange(e.target.value)}
        placeholder={DEFAULT_REFUND_PER_CERTIFICATION}
        className="px-3 py-2.5 text-sm"
      />
    </>
  );
}
