"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginButton({ inviteCode }: { inviteCode?: string }) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    setIsLoading(true);
    const supabase = createClient();
    // Kakao/Supabase's redirect chain lands back on /auth/callback with no
    // memory of why the user started logging in — an invite link's ?code=
    // has to be threaded through explicitly via `next`, or a first-time
    // crew member clicking a /join?code= link loses the code the moment
    // they're bounced through login and ends up on a blank join form.
    const next = inviteCode ? `/join?code=${encodeURIComponent(inviteCode)}` : undefined;
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (next) callbackUrl.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: callbackUrl.toString(),
        // talk_message lets us later send a "나에게 보내기" KakaoTalk
        // notification (new re-review request, or your own activity being
        // rejected) — it's an optional consent item, so declining it just
        // means no notifications, not a blocked login.
        scopes: "profile_nickname profile_image talk_message",
      },
    });
    // On success this navigates away, so isLoading never needs to reset.
    // If it fails before navigating (e.g. offline), reset so the button
    // isn't stuck showing "이동 중...".
    if (error) {
      console.error("[login] signInWithOAuth failed:", error.message);
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogin}
      disabled={isLoading}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] px-5 py-3.5 font-semibold text-[#191600] transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      <svg
        aria-hidden="true"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M10 1.5C4.75 1.5 0.5 4.86 0.5 9c0 2.64 1.75 4.96 4.4 6.28-.19.7-.7 2.58-.8 2.98-.13.5.18.5.38.36.16-.11 2.5-1.7 3.52-2.4.65.09 1.32.14 2 .14 5.25 0 9.5-3.36 9.5-7.36S15.25 1.5 10 1.5Z" />
      </svg>
      {isLoading ? "이동 중..." : "카카오로 로그인"}
    </button>
  );
}
