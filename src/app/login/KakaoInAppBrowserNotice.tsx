"use client";

import { useEffect, useState } from "react";

// KakaoTalk's in-app browser (opened by tapping a link shared in chat) has a
// known cookie-handling quirk: the cookie that stores Kakao OAuth's PKCE
// state can get lost during the round trip to Kakao's own login screen and
// back, which then fails the token exchange in /auth/callback and bounces
// the user back to /login. Kakao's own escape hatch is this custom scheme,
// which asks KakaoTalk to reopen the current URL in the device's default
// browser instead.
function openInExternalBrowser() {
  window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(window.location.href)}`;
}

export function KakaoInAppBrowserNotice() {
  const [isKakaoWebview, setIsKakaoWebview] = useState(false);

  useEffect(() => {
    if (!/KAKAOTALK/i.test(navigator.userAgent)) return;
    const timer = setTimeout(() => {
      setIsKakaoWebview(true);
      openInExternalBrowser();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!isKakaoWebview) return null;

  return (
    <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-base text-amber-700 dark:bg-amber-950 dark:text-amber-400">
      카카오톡 브라우저에서는 로그인이 불안정할 수 있어요. 외부 브라우저로 이동할게요.
      <button
        type="button"
        onClick={openInExternalBrowser}
        className="mt-2 block w-full rounded-lg bg-amber-100 px-3 py-2 text-center text-base font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-200"
      >
        외부 브라우저로 열기
      </button>
    </div>
  );
}
