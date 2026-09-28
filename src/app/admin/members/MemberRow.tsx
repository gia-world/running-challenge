"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";

export function MemberRow({
  membershipId,
  name,
  role,
}: {
  membershipId: string;
  name: string;
  role: UserRole;
}) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function promoteToAdmin() {
    setIsSubmitting(true);
    setError(null);
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("team_memberships")
      .update({ role: "admin" })
      .eq("id", membershipId);

    if (updateError) {
      setError("처리에 실패했어요.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setIsConfirming(false);
    router.refresh();
  }

  return (
    <li className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-ink-strong">{name}</span>
        {role === "admin" && (
          <span className="rounded-full bg-primary-100 px-2 py-0.5 text-sm font-medium text-primary-600">
            관리자
          </span>
        )}
      </div>

      {role === "user" && (
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={() => setIsConfirming(true)}
            className="text-base font-medium text-primary"
          >
            관리자로 지정
          </button>
          {error && <span className="text-sm text-danger">{error}</span>}
        </div>
      )}

      {isConfirming && (
        <BottomSheet onClose={() => setIsConfirming(false)}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-base font-semibold text-ink-strong">
                {name}님을 관리자로 지정할까요?
              </span>
              <span className="text-sm text-ink-secondary">
                관리자는 팀원과 시즌, 인증 요청을 관리할 수 있어요.
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="auto"
                className="flex-1"
                onClick={() => setIsConfirming(false)}
                disabled={isSubmitting}
              >
                닫기
              </Button>
              <Button
                size="auto"
                className="flex-1"
                onClick={promoteToAdmin}
                disabled={isSubmitting}
              >
                {isSubmitting ? "처리 중..." : "관리자로 지정"}
              </Button>
            </div>
          </div>
        </BottomSheet>
      )}
    </li>
  );
}
