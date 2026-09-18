"use client";

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
      <label className="flex flex-col gap-1">
        <span className="text-base text-zinc-500 dark:text-zinc-400">
          참가비 {required ? "(원)" : "(원, 선택)"}
        </span>
        <input
          type="number"
          min="0"
          step="1000"
          inputMode="numeric"
          value={entryFee}
          onChange={(e) => onEntryFeeChange(e.target.value)}
          placeholder={DEFAULT_ENTRY_FEE}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-base text-zinc-500 dark:text-zinc-400">
          인증 1회당 환급 단가 {required ? "(원)" : "(원, 선택)"}
        </span>
        <input
          type="number"
          min="0"
          step="500"
          inputMode="numeric"
          value={refundPerCertification}
          onChange={(e) => onRefundPerCertificationChange(e.target.value)}
          placeholder={DEFAULT_REFUND_PER_CERTIFICATION}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
      </label>
    </>
  );
}
