"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Textarea } from "@/components/Textarea";
import { Button } from "@/components/Button";
import { SettlementSheet } from "@/components/SettlementSheet";

/**
 * Approve/reject a dropout request. Approving shares SettlementSheet with
 * ParticipantToggle's admin-initiated cancel — both end in the same
 * decision (settlement amount the admin types themselves, since dropout
 * doesn't follow the normal per-certification formula). Rejecting doesn't
 * involve a settlement at all, so it stays its own small inline form.
 */
export function DropoutRequestItem({
  requestId,
  seasonId,
  userId,
  memberName,
  maxSettlementAmount = null,
}: {
  requestId: string;
  seasonId: string;
  userId: string;
  memberName: string;
  /** The season's own entry fee, when it has one — caps the settlement amount so it can't exceed it. */
  maxSettlementAmount?: number | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "approving" | "rejecting">("idle");
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve(settlementAmount: number | null, adminNote: string | null) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from("season_dropout_requests")
      .update({
        status: "approved",
        settlement_amount: settlementAmount,
        admin_note: adminNote,
        decided_by: user?.id,
        decided_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) return "처리에 실패했어요. 다시 시도해주세요.";

    // Approving ends their participation too — same as an admin directly
    // hitting "참여 취소" on ParticipantToggle.
    const { error: deleteError } = await supabase
      .from("season_memberships")
      .delete()
      .eq("season_id", seasonId)
      .eq("user_id", userId);

    if (deleteError) return "참여 취소 처리에 실패했어요. 다시 시도해주세요.";

    setMode("idle");
    router.refresh();
  }

  async function reject() {
    if (!rejectReason.trim()) {
      setError("반려 사유를 입력해주세요.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from("season_dropout_requests")
      .update({
        status: "rejected",
        admin_note: rejectReason.trim(),
        decided_by: user?.id,
        decided_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) {
      setError("처리에 실패했어요. 다시 시도해주세요.");
      setIsSubmitting(false);
      return;
    }
    router.refresh();
  }

  if (mode === "rejecting") {
    return (
      <div className="mt-3 flex flex-col gap-2">
        <Textarea
          value={rejectReason}
          onChange={setRejectReason}
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
    <>
      <div className="mt-3 flex flex-col gap-2">
        <div className="flex gap-2">
          <Button size="auto" className="flex-1" onClick={() => setMode("approving")}>
            승인
          </Button>
          <Button
            variant="secondary"
            size="auto"
            className="flex-1"
            onClick={() => setMode("rejecting")}
          >
            반려
          </Button>
        </div>
      </div>

      {mode === "approving" && (
        <SettlementSheet
          title={`${memberName}님 중도하차 승인`}
          description="정산액은 계산되지 않아요. 직접 정해주세요."
          confirmLabel="승인 확정"
          maxAmount={maxSettlementAmount}
          onConfirm={approve}
          onClose={() => setMode("idle")}
        />
      )}
    </>
  );
}
