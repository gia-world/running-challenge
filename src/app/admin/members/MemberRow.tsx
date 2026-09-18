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
    <li className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">{name}</span>
        {role === "admin" && (
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-sm font-medium text-orange-600 dark:bg-orange-950 dark:text-orange-400">
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
            className="text-base font-medium text-orange-500 disabled:opacity-60"
          >
            {isSubmitting ? "처리 중..." : "관리자로 지정"}
          </button>
          {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
        </div>
      )}
    </li>
  );
}
