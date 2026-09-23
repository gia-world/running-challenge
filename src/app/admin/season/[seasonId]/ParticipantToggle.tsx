"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";
import { SettlementSheet } from "@/components/SettlementSheet";

/**
 * "참여 취소" no longer just deletes the membership — since it ends someone's
 * participation exactly like an approved dropout request does, it goes
 * through the same admin-decides-settlement step (SettlementSheet, shared
 * with admin/dropout's approve flow). When the member already has a
 * pending dropout request, confirming here resolves that request
 * (approved) instead of creating a second, stray one; otherwise this
 * cancellation IS the (admin-initiated) dropout decision.
 */
export function ParticipantToggle({
  seasonId,
  userId,
  memberName,
  initialIsParticipant,
  pendingDropoutRequestId = null,
}: {
  seasonId: string;
  userId: string;
  memberName: string;
  initialIsParticipant: boolean;
  pendingDropoutRequestId?: string | null;
}) {
  const router = useRouter();
  const [isParticipant, setIsParticipant] = useState(initialIsParticipant);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function addParticipant() {
    setIsSubmitting(true);
    const supabase = createClient();
    await supabase.from("season_memberships").insert({ season_id: seasonId, user_id: userId });
    setIsParticipant(true);
    setIsSubmitting(false);
    router.refresh();
  }

  async function confirmCancel(settlementAmount: number | null, adminNote: string | null) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const decision = {
      status: "approved" as const,
      settlement_amount: settlementAmount,
      admin_note: adminNote,
      decided_by: user?.id,
      decided_at: new Date().toISOString(),
    };

    const { error: decisionError } = pendingDropoutRequestId
      ? await supabase
          .from("season_dropout_requests")
          .update(decision)
          .eq("id", pendingDropoutRequestId)
      : await supabase
          .from("season_dropout_requests")
          .insert({ season_id: seasonId, user_id: userId, ...decision });

    if (decisionError) return "처리에 실패했어요. 다시 시도해주세요.";

    const { error: deleteError } = await supabase
      .from("season_memberships")
      .delete()
      .eq("season_id", seasonId)
      .eq("user_id", userId);

    if (deleteError) return "참여 취소에 실패했어요. 다시 시도해주세요.";

    setIsParticipant(false);
    setIsCancelling(false);
    router.refresh();
  }

  if (!isParticipant) {
    return (
      <Button size="pill" onClick={addParticipant} disabled={isSubmitting}>
        참여 추가
      </Button>
    );
  }

  return (
    <>
      <Button size="pill" variant="secondary" onClick={() => setIsCancelling(true)} disabled={isSubmitting}>
        참여 취소
      </Button>

      {isCancelling && (
        <SettlementSheet
          title={`${memberName}님 참여 취소`}
          description="참여를 취소하면 정산액이 자동으로 계산되지 않아요. 직접 정해주세요."
          confirmLabel="취소 확정"
          confirmVariant="danger"
          onConfirm={confirmCancel}
          onClose={() => setIsCancelling(false)}
        />
      )}
    </>
  );
}
