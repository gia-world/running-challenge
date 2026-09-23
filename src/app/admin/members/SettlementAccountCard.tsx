"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { CopyButton } from "@/components/CopyButton";

/**
 * The team's own account — distinct from each person's `profiles.bank_*`
 * (where THEIR refund/prize goes). This one is where a renewing
 * participant sends the "벌금" — the part of their entry fee that didn't
 * carry over because they missed the weekly goal — so the personal season
 * report can tell them exactly where to send it.
 */
export function SettlementAccountCard({
  teamId,
  initialBankName,
  initialAccountNumber,
}: {
  teamId: string;
  initialBankName: string | null;
  initialAccountNumber: string | null;
}) {
  const router = useRouter();
  const hasInitialInfo = !!(initialBankName && initialAccountNumber);
  const [isEditing, setIsEditing] = useState(!hasInitialInfo);
  const [bankName, setBankName] = useState(initialBankName ?? "");
  const [accountNumber, setAccountNumber] = useState(initialAccountNumber ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("teams")
      .update({
        settlement_bank_name: bankName.trim() || null,
        settlement_account_number: accountNumber.trim() || null,
      })
      .eq("id", teamId);

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
      <div className="rounded-2xl border border-border bg-surface px-4 py-3">
        <p className="text-base font-medium text-ink-secondary">정산 계좌</p>
        <p className="mt-1 text-sm text-ink-tertiary">챌린지용 계좌예요.</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-base text-ink-strong">
            {initialBankName} {initialAccountNumber}
          </span>
          <div className="flex shrink-0 gap-2">
            <CopyButton value={initialAccountNumber ?? ""} />
            <Button size="pill" onClick={() => setIsEditing(true)}>
              변경
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface px-4 py-3"
    >
      <div>
        <p className="text-base font-medium text-ink-secondary">정산 계좌</p>
        <p className="mt-1 text-sm text-ink-tertiary">챌린지용 계좌예요.</p>
      </div>

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

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "저장 중..." : "저장하기"}
      </Button>
    </form>
  );
}
