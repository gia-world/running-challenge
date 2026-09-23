"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Textarea } from "@/components/Textarea";
import { BottomSheet } from "@/components/BottomSheet";

/**
 * Shared "누군가 시즌을 그만두는데 정산액을 관리자가 직접 정한다" modal —
 * used both when approving a dropout request (admin/dropout) and when an
 * admin cancels someone's participation directly with no prior request
 * (ParticipantToggle). Both are the same decision (settlement amount +
 * optional note, then some caller-specific write), just reached from
 * different starting points, so the form itself lives here once.
 */
export function SettlementSheet({
  title,
  description,
  confirmLabel,
  confirmVariant = "primary",
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  /** Return an error message to show and keep the sheet open; return nothing on success (the caller closes/refreshes). */
  onConfirm: (settlementAmount: number | null, adminNote: string | null) => Promise<string | void>;
  onClose: () => void;
}) {
  const [settlementAmount, setSettlementAmount] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    const trimmed = settlementAmount.trim();
    const amount = trimmed ? Number(trimmed) : null;
    if (trimmed && (Number.isNaN(amount) || (amount ?? 0) < 0)) {
      setError("정산액을 올바르게 입력해주세요.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const errorMessage = await onConfirm(amount, adminNote.trim() || null);
    if (errorMessage) {
      setError(errorMessage);
      setIsSubmitting(false);
    }
  }

  return (
    <BottomSheet onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink-strong">{title}</h2>
          <p className="mt-1 text-base text-ink-secondary">{description}</p>
        </div>
        <Input
          type="number"
          label="정산액 (원, 비워두면 정산 없음)"
          value={settlementAmount}
          onChange={(e) => setSettlementAmount(e.target.value)}
          placeholder="예: 30000"
        />
        <Textarea
          value={adminNote}
          onChange={setAdminNote}
          placeholder="메모 (선택)"
          maxLength={200}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button
            variant={confirmVariant}
            size="auto"
            className="flex-1"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {confirmLabel}
          </Button>
          <Button variant="secondary" size="auto" className="flex-1" onClick={onClose} disabled={isSubmitting}>
            닫기
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
