"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/Input";
import { Textarea } from "@/components/Textarea";
import { Button } from "@/components/Button";

/**
 * Approve/reject a dropout request. Unlike ReviewItem's "인정 유지" (a
 * direct action, no form), approving here still needs a form — dropout
 * settlement doesn't follow the normal per-certification formula, so the
 * admin types the refund amount themselves rather than the app computing it.
 */
export function DropoutRequestItem({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "approving" | "rejecting">("idle");
  const [settlementAmount, setSettlementAmount] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(status: "approved" | "rejected", extra: Record<string, unknown>) {
    setIsSubmitting(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from("season_dropout_requests")
      .update({
        status,
        decided_by: user?.id,
        decided_at: new Date().toISOString(),
        ...extra,
      })
      .eq("id", requestId);

    if (updateError) {
      setError("처리에 실패했어요. 다시 시도해주세요.");
      setIsSubmitting(false);
      return;
    }
    router.refresh();
  }

  async function approve() {
    const trimmed = settlementAmount.trim();
    const amount = trimmed ? Number(trimmed) : null;
    if (trimmed && (Number.isNaN(amount) || (amount ?? 0) < 0)) {
      setError("정산액을 올바르게 입력해주세요.");
      return;
    }
    await decide("approved", {
      settlement_amount: amount,
      admin_note: adminNote.trim() || null,
    });
  }

  async function reject() {
    if (!adminNote.trim()) {
      setError("반려 사유를 입력해주세요.");
      return;
    }
    await decide("rejected", { admin_note: adminNote.trim() });
  }

  if (mode === "approving") {
    return (
      <div className="mt-3 flex flex-col gap-2">
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
          <Button size="auto" className="flex-1" onClick={approve} disabled={isSubmitting}>
            승인 확정
          </Button>
          <Button
            variant="secondary"
            size="auto"
            className="flex-1"
            onClick={() => {
              setMode("idle");
              setError(null);
            }}
            disabled={isSubmitting}
          >
            닫기
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "rejecting") {
    return (
      <div className="mt-3 flex flex-col gap-2">
        <Textarea
          value={adminNote}
          onChange={setAdminNote}
          placeholder="반려 사유를 입력해주세요"
          maxLength={200}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button variant="danger" size="auto" className="flex-1" onClick={reject} disabled={isSubmitting}>
            반려 확정
          </Button>
          <Button
            variant="secondary"
            size="auto"
            className="flex-1"
            onClick={() => {
              setMode("idle");
              setError(null);
            }}
            disabled={isSubmitting}
          >
            닫기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button size="auto" className="flex-1" onClick={() => setMode("approving")} disabled={isSubmitting}>
          승인
        </Button>
        <Button
          variant="secondary"
          size="auto"
          className="flex-1"
          onClick={() => setMode("rejecting")}
          disabled={isSubmitting}
        >
          반려
        </Button>
      </div>
    </div>
  );
}
