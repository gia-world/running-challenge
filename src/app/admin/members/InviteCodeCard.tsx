"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function randomInviteCode(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

export function InviteCodeCard({
  teamId,
  initialCode,
}: {
  teamId: string;
  initialCode: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inviteLink =
    typeof window !== "undefined" ? `${window.location.origin}/join?code=${code}` : "";

  async function copy(text: string, kind: "code" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setError("복사에 실패했어요.");
    }
  }

  async function regenerate() {
    setIsRegenerating(true);
    setError(null);
    const supabase = createClient();
    const newCode = randomInviteCode();

    const { error: updateError } = await supabase
      .from("teams")
      .update({ invite_code: newCode })
      .eq("id", teamId);

    if (updateError) {
      setError("재발급에 실패했어요. 다시 시도해주세요.");
      setIsRegenerating(false);
      return;
    }

    setCode(newCode);
    setIsRegenerating(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">초대 코드</p>
      <div className="mt-2 flex items-center gap-2">
        <p className="flex-1 rounded-lg bg-zinc-100 px-3 py-2 text-center font-mono text-lg font-bold tracking-widest text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
          {code}
        </p>
        <button
          type="button"
          onClick={() => copy(code, "code")}
          className="rounded-lg bg-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          {copied === "code" ? "복사됨" : "복사"}
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => copy(inviteLink, "link")}
          className="flex-1 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white"
        >
          {copied === "link" ? "링크 복사됨" : "초대 링크 복사"}
        </button>
        <button
          type="button"
          onClick={regenerate}
          disabled={isRegenerating}
          className="rounded-lg bg-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 disabled:opacity-60 dark:bg-zinc-800 dark:text-zinc-300"
        >
          {isRegenerating ? "재발급 중..." : "재발급"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
