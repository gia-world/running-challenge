import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the redirect back from Supabase after Kakao OAuth.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

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
      // Only present if the user granted the optional talk_message scope.
      // Stored so the backend can send KakaoTalk notifications later,
      // without the user needing to be in an active browser session.
      const refreshToken = data.session?.provider_refresh_token;
      if (refreshToken && data.session) {
        const { error: tokenError } = await supabase
          .from("kakao_tokens")
          .upsert({ user_id: data.session.user.id, refresh_token: refreshToken });
        if (tokenError) {
          console.error("[auth/callback] failed to store kakao refresh token:", tokenError.message);
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
