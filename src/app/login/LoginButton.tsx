"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
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
