"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";

// Requests the talk_message scope on its own, right after normal login.
// Kakao categorizes talk_message as "이용 중 동의" — including it in the
// main login's scope list doesn't surface a consent screen for it; Kakao
// only prompts when it's requested through its own dedicated
// authorization request, which is what this page fires automatically.
function KakaoConsentRedirect() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/home";

  useEffect(() => {
    let cancelled = false;

    async function requestConsent() {
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

      // On success this navigates away. If it fails before navigating
      // (e.g. offline), just continue on to `next` rather than getting
      // stuck on a spinner.
      if (error && !cancelled) {
        console.error("[kakao-consent] signInWithOAuth failed:", error.message);
        window.location.href = next;
      }
    }

    requestConsent();
    return () => {
      cancelled = true;
    };
  }, [next]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

export default function KakaoConsentPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center"><LoadingSpinner /></div>}>
      <KakaoConsentRedirect />
    </Suspense>
  );
}
