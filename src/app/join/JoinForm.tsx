"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function JoinForm({ initialCode }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join(joinCode: string) {
    const trimmed = joinCode.trim();
    if (!trimmed) {
      setError("초대 코드를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("join_team_by_invite_code", {
        p_code: trimmed,
      });

      if (rpcError) {
        console.error("[join] join_team_by_invite_code failed:", rpcError.message);
        setError("초대 코드가 올바르지 않아요. 다시 확인해주세요.");
        setIsSubmitting(false);
        return;
      }
    } catch (err) {
      console.error("[join] unexpected error calling join_team_by_invite_code:", err);
      setError("참여에 실패했어요. 잠시 후 다시 시도해주세요.");
      setIsSubmitting(false);
      return;
    }

    router.push("/home");
    router.refresh();
  }

  useEffect(() => {
    if (!initialCode) return;
    // Deferred so the auto-join for the ?code= link case doesn't set state
    // synchronously during the effect itself.
    const timeoutId = setTimeout(() => join(initialCode), 0);
    return () => clearTimeout(timeoutId);
    // Only run once on mount for the ?code= link case.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    join(code);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="초대 코드"
        autoFocus
        className="rounded-xl border border-border-strong px-3 py-2.5 text-center text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-primary px-5 py-3.5 font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "참여 중..." : "참여하기"}
      </button>
    </form>
  );
}
