"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Requests the talk_message scope on its own, right after normal login.
// Kakao categorizes talk_message as "이용 중 동의" — including it in the
// main login's scope list doesn't surface a consent screen for it, and an
// automatic redirect straight into this second authorize request (chained
// off the login redirect) also gets silently skipped by Kakao without
// showing a prompt. A real, user-initiated tap is what actually triggers
// the consent screen, so this page waits for a button click instead of
// firing on mount.
function KakaoConsentPrompt() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/home";
  const [isLoading, setIsLoading] = useState(false);

  async function handleAllow() {
    setIsLoading(true);
    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", next);
    callbackUrl.searchParams.set("consent_attempted", "1");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: callbackUrl.toString(),
        scopes: "talk_message",
      },
    });

    if (error) {
      console.error("[kakao-consent] signInWithOAuth failed:", error.message);
      setIsLoading(false);
    }
  }

  function handleSkip() {
    window.location.href = next;
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-3xl">💬</p>
      <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
        카카오톡 알림을 받아보세요
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        재인증 요청이 들어오거나 인증이 반려되면
        <br /> 카카오톡으로 바로 알려드려요.
      </p>
      <button
        type="button"
        onClick={handleAllow}
        disabled={isLoading}
        className="mt-2 w-full max-w-xs rounded-xl bg-[#FEE500] px-5 py-3.5 font-semibold text-[#191600] disabled:opacity-60"
      >
        {isLoading ? "이동 중..." : "카카오톡 알림 받기"}
      </button>
      <button
        type="button"
        onClick={handleSkip}
        disabled={isLoading}
        className="text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        나중에 하기
      </button>
    </div>
  );
}

export default function KakaoConsentPage() {
  return (
    <Suspense fallback={<div className="flex flex-1" />}>
      <KakaoConsentPrompt />
    </Suspense>
  );
}
