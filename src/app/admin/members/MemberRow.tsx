"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";

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
            onClick={promoteToAdmin}
            disabled={isSubmitting}
            className="text-base font-medium text-primary disabled:opacity-60"
          >
            {isSubmitting ? "처리 중..." : "관리자로 지정"}
          </button>
          {error && <span className="text-sm text-danger">{error}</span>}
        </div>
      )}
    </li>
  );
}
