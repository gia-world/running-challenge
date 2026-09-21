"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/Input";

export function BankForm({
  userId,
  initialBankName,
  initialAccountNumber,
  onSaved,
}: {
  userId: string;
  initialBankName: string;
  initialAccountNumber: string;
  onSaved?: () => void;
}) {
  const hasInitialInfo = !!(initialBankName && initialAccountNumber);
  const [isEditing, setIsEditing] = useState(!hasInitialInfo);
  const [bankName, setBankName] = useState(initialBankName);
  const [accountNumber, setAccountNumber] = useState(initialAccountNumber);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        bank_name: bankName.trim() || null,
        bank_account_number: accountNumber.trim() || null,
      })
      .eq("id", userId);

    if (updateError) {
      setError("저장에 실패했어요. 다시 시도해주세요.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setIsEditing(false);
    onSaved?.();
  }

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between gap-4">
        <span className="text-base text-ink">
          {bankName} {accountNumber}
        </span>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="rounded-xl bg-primary px-3 py-2 font-semibold text-white"
        >
          변경
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input
        type="text"
        label="은행"
        value={bankName}
        onChange={(e) => setBankName(e.target.value)}
        placeholder="국민은행"
      />

      <Input
        type="text"
        inputMode="numeric"
        label="계좌번호"
        value={accountNumber}
        onChange={(e) => setAccountNumber(e.target.value)}
        placeholder="123456-78-901234"
      />

      {error && (
        <p className="text-sm text-danger">{error}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "저장 중..." : "저장하기"}
      </button>
    </form>
  );
}
