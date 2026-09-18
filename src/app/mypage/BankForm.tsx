"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export function BankForm({
  userId,
  initialBankName,
  initialAccountNumber,
}: {
  userId: string;
  initialBankName: string;
  initialAccountNumber: string;
}) {
  const [bankName, setBankName] = useState(initialBankName);
  const [accountNumber, setAccountNumber] = useState(initialAccountNumber);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSaved(false);

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

    setSaved(true);
    setIsSubmitting(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900"
    >
      <label className="flex flex-col gap-1">
        <span className="text-base text-zinc-500 dark:text-zinc-400">은행</span>
        <input
          type="text"
          value={bankName}
          onChange={(e) => {
            setBankName(e.target.value);
            setSaved(false);
          }}
          placeholder="국민은행"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-base text-zinc-500 dark:text-zinc-400">계좌번호</span>
        <input
          type="text"
          inputMode="numeric"
          value={accountNumber}
          onChange={(e) => {
            setAccountNumber(e.target.value);
            setSaved(false);
          }}
          placeholder="123456-78-901234"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {saved && !error && (
        <p className="text-sm text-green-600 dark:text-green-400">저장했어요.</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "저장 중..." : "저장하기"}
      </button>
    </form>
  );
}
