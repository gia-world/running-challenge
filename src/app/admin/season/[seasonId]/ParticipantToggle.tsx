"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Textarea } from "@/components/Textarea";
import { BottomSheet } from "@/components/BottomSheet";

/**
 * "참여 취소" no longer just deletes the membership — since it ends someone's
 * participation exactly like an approved dropout request does, it goes
 * through the same admin-decides-settlement step. When the member already
 * has a pending dropout request, confirming here resolves that request
 * (approved) instead of creating a second, stray one; otherwise this
 * cancellation IS the (admin-initiated) dropout decision. That step needs
 * two fields, so it's a BottomSheet (per DESIGN.md: "새로운 정보 입력/확인이
 * 지금 이 화면에서 필요해진 순간") rather than expanding inline in the
 * participant row.
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
  const [settlementAmount, setSettlementAmount] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addParticipant() {
    setIsSubmitting(true);
    const supabase = createClient();
    await supabase.from("season_memberships").insert({ season_id: seasonId, user_id: userId });
    setIsParticipant(true);
    setIsSubmitting(false);
    router.refresh();
  }

  function closeCancelSheet() {
    setIsCancelling(false);
    setError(null);
  }

  async function confirmCancel() {
    const trimmed = settlementAmount.trim();
    const amount = trimmed ? Number(trimmed) : null;
    if (trimmed && (Number.isNaN(amount) || (amount ?? 0) < 0)) {
      setError("정산액을 올바르게 입력해주세요.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const decision = {
      status: "approved" as const,
      settlement_amount: amount,
      admin_note: adminNote.trim() || null,
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

    if (decisionError) {
      setError("처리에 실패했어요. 다시 시도해주세요.");
      setIsSubmitting(false);
      return;
    }

    const { error: deleteError } = await supabase
      .from("season_memberships")
      .delete()
      .eq("season_id", seasonId)
      .eq("user_id", userId);

    if (deleteError) {
      setError("참여 취소에 실패했어요. 다시 시도해주세요.");
      setIsSubmitting(false);
      return;
    }

    setIsParticipant(false);
    setIsCancelling(false);
    setIsSubmitting(false);
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
        <BottomSheet onClose={closeCancelSheet}>
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-bold text-ink-strong">{memberName}님 참여 취소</h2>
              <p className="mt-1 text-base text-ink-secondary">
                참여를 취소하면 정산액이 자동으로 계산되지 않아요. 직접 정해주세요.
              </p>
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
                variant="danger"
                size="auto"
                className="flex-1"
                onClick={confirmCancel}
                disabled={isSubmitting}
              >
                취소 확정
              </Button>
              <Button
                variant="secondary"
                size="auto"
                className="flex-1"
                onClick={closeCancelSheet}
                disabled={isSubmitting}
              >
                닫기
              </Button>
            </div>
          </div>
        </BottomSheet>
      )}
    </>
  );
}
