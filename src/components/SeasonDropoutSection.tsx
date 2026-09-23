"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";
import { Textarea } from "@/components/Textarea";
import { formatWon } from "@/lib/format";

type DropoutRequest = {
  id: string;
  status: "pending" | "approved" | "rejected";
  reason: string;
  settlement_amount: number | null;
  admin_note: string | null;
};

/**
 * Lets a season participant request to drop out mid-season with a reason.
 * Settlement doesn't follow the normal per-certification formula for a
 * dropout, so this never computes a refund itself — it only shows whatever
 * amount (or note) the admin decided once the request is resolved.
 */
export function SeasonDropoutSection({
  seasonId,
  userId,
  initialRequest,
}: {
  seasonId: string;
  userId: string;
  initialRequest: DropoutRequest | null;
}) {
  const router = useRouter();
  const [request, setRequest] = useState(initialRequest);
  const [isComposing, setIsComposing] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitRequest() {
    if (!reason.trim()) {
      setError("사유를 입력해주세요.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("season_dropout_requests")
      .insert({ season_id: seasonId, user_id: userId, reason: reason.trim() })
      .select("id, status, reason, settlement_amount, admin_note")
      .single();

    if (insertError || !data) {
      setError("요청에 실패했어요. 다시 시도해주세요.");
      setIsSubmitting(false);
      return;
    }

    setRequest(data as DropoutRequest);
    setIsComposing(false);
    setReason("");
    setIsSubmitting(false);
    router.refresh();
  }

  async function withdrawRequest() {
    if (!request) return;
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("season_dropout_requests")
      .delete()
      .eq("id", request.id);

    if (deleteError) {
      setError("취소에 실패했어요. 다시 시도해주세요.");
      setIsSubmitting(false);
      return;
    }

    setRequest(null);
    setIsSubmitting(false);
    router.refresh();
  }

  if (request?.status === "pending") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-base text-ink">
          중도하차 요청을 보냈어요. 관리자 확인을 기다리고 있어요.
        </p>
        <p className="text-sm text-ink-secondary">사유: {request.reason}</p>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button variant="secondary" size="auto" onClick={withdrawRequest} disabled={isSubmitting}>
          요청 취소
        </Button>
      </div>
    );
  }

  if (request?.status === "approved") {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-base text-ink">중도하차가 승인됐어요.</p>
        <p className="text-sm text-ink-secondary">
          {request.settlement_amount != null
            ? `정산액 ${formatWon(Number(request.settlement_amount))}`
            : "정산 금액은 관리자에게 확인해주세요."}
        </p>
        {request.admin_note && (
          <p className="text-sm text-ink-tertiary">{request.admin_note}</p>
        )}
      </div>
    );
  }

  if (isComposing) {
    return (
      <div className="flex flex-col gap-2">
        <Textarea
          value={reason}
          onChange={setReason}
          placeholder="중도하차 사유를 입력해주세요"
          maxLength={200}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button size="auto" className="flex-1" onClick={submitRequest} disabled={isSubmitting}>
            요청 보내기
          </Button>
          <Button
            variant="secondary"
            size="auto"
            className="flex-1"
            onClick={() => {
              setIsComposing(false);
              setError(null);
              setReason("");
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
    <div className="flex flex-col gap-2">
      {request?.status === "rejected" && (
        <p className="text-sm text-ink-secondary">
          지난 요청이 반려됐어요.
          {request.admin_note ? ` (${request.admin_note})` : ""}
        </p>
      )}
      <Button variant="secondary" size="auto" onClick={() => setIsComposing(true)}>
        중도하차 요청
      </Button>
    </div>
  );
}
