import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the redirect back from Supabase after Kakao OAuth.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";
  // Set on the second leg (after /auth/kakao-consent) so we don't loop back
  // into asking for talk_message again if the user declined it there.
  const consentAttempted = searchParams.get("consent_attempted") === "1";

  // Supabase/Kakao redirect here with `error`/`error_description` instead of
  // `code` when the OAuth flow itself failed (e.g. denied consent).
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");
  if (oauthError) {
    console.error("[auth/callback] OAuth provider returned an error:", oauthError);
    return NextResponse.redirect(
      `${origin}/login?error=auth_failed&reason=${encodeURIComponent(oauthError)}`,
    );
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Only present on the /auth/kakao-consent leg, where talk_message is
      // requested on its own. Stored so the backend can send KakaoTalk
      // notifications later, without the user needing an active session.
      const refreshToken = data.session?.provider_refresh_token;
      if (refreshToken && data.session) {
        const { error: tokenError } = await supabase
          .from("kakao_tokens")
          .upsert({ user_id: data.session.user.id, refresh_token: refreshToken });
        if (tokenError) {
          console.error("[auth/callback] failed to store kakao refresh token:", tokenError.message);
        }
      }

      if (!consentAttempted && data.session) {
        const { data: existingToken } = await supabase
          .from("kakao_tokens")
          .select("user_id")
          .eq("user_id", data.session.user.id)
          .maybeSingle();

        if (!existingToken) {
          const consentUrl = new URL("/auth/kakao-consent", origin);
          consentUrl.searchParams.set("next", next);
          return NextResponse.redirect(consentUrl.toString());
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }

    // The code may have already been exchanged by an earlier hit on this
    // same callback URL (a page reload, the browser retrying a slow
    // request, or the user navigating back) — OAuth codes are single-use,
    // so a second exchange attempt fails even though the user is already
    // signed in. Treat an existing session as success instead of bouncing
    // them back to /login.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
    return NextResponse.redirect(
      `${origin}/login?error=auth_failed&reason=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
