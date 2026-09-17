import type { SupabaseClient } from "@supabase/supabase-js";

const KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token";
const KAKAO_MEMO_URL = "https://kapi.kakao.com/v2/api/talk/memo/default/send";

type RefreshResult = { accessToken: string; refreshToken: string | null };

/**
 * Kakao access tokens are short-lived; the refresh token we stored at login
 * is what lets the backend mint a fresh one later, outside any browser
 * session. Kakao occasionally rotates the refresh token itself on refresh,
 * hence the nullable `refreshToken` in the result — callers should persist
 * it when present.
 */
export async function refreshKakaoAccessToken(refreshToken: string): Promise<RefreshResult | null> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: process.env.KAKAO_CLIENT_ID!,
    refresh_token: refreshToken,
  });
  if (process.env.KAKAO_CLIENT_SECRET) {
    params.set("client_secret", process.env.KAKAO_CLIENT_SECRET);
  }

  const response = await fetch(KAKAO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!response.ok) {
    console.error("[kakao] failed to refresh access token:", await response.text());
    return null;
  }

  const data = await response.json();
  return { accessToken: data.access_token, refreshToken: data.refresh_token ?? null };
}

/** Sends a KakaoTalk "나에게 보내기" text memo, optionally deep-linking into the app. */
export async function sendKakaoMemo(
  accessToken: string,
  text: string,
  linkPath?: string,
): Promise<boolean> {
  // Trim a trailing slash so a base URL configured with one (e.g.
  // "https://example.com/") doesn't double up with linkPath's leading "/".
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  if (!baseUrl) {
    console.error("[kakao] NEXT_PUBLIC_APP_URL is not set — sending memo without a link");
  }
  const hasLink = Boolean(baseUrl && linkPath);
  const templateObject = {
    object_type: "text",
    text,
    link: hasLink ? { web_url: `${baseUrl}${linkPath}`, mobile_web_url: `${baseUrl}${linkPath}` } : {},
    // Kakao's default "text" template only renders a tappable button when
    // button_title is set — populating `link` alone isn't enough.
    ...(hasLink ? { button_title: "바로 확인" } : {}),
  };

  const response = await fetch(KAKAO_MEMO_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ template_object: JSON.stringify(templateObject) }),
  });

  if (!response.ok) {
    console.error("[kakao] failed to send memo:", await response.text());
    return false;
  }
  return true;
}

/**
 * Looks up the given user's stored kakao_tokens row (service client, so
 * this bypasses RLS by design), refreshes an access token from it, and
 * sends them a memo. Silently no-ops for a user who never granted
 * talk_message (no stored row) or whose refresh failed — a missed
 * notification isn't worth surfacing an error over, since the underlying
 * DB state (the request or rejection itself) is unaffected either way.
 */
export async function notifyUserByKakao(
  supabase: SupabaseClient,
  userId: string,
  text: string,
  linkPath?: string,
): Promise<void> {
  const { data: tokenRow } = await supabase
    .from("kakao_tokens")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();

  if (!tokenRow) return;

  const refreshed = await refreshKakaoAccessToken(tokenRow.refresh_token);
  if (!refreshed) return;

  if (refreshed.refreshToken && refreshed.refreshToken !== tokenRow.refresh_token) {
    await supabase
      .from("kakao_tokens")
      .update({ refresh_token: refreshed.refreshToken })
      .eq("user_id", userId);
  }

  await sendKakaoMemo(refreshed.accessToken, text, linkPath);
}
