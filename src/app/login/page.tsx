import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { LoginButton } from "./LoginButton";
import { KakaoInAppBrowserNotice } from "./KakaoInAppBrowserNotice";
import { TeamEyebrow } from "@/components/TeamEyebrow";
import { ErrorBanner } from "@/components/ErrorBanner";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string; code?: string }>;
}) {
  const user = await getAuthUser();
  const { error, reason, code } = await searchParams;

  if (user) {
    redirect(code ? `/join?code=${encodeURIComponent(code)}` : "/home");
  }

  // Not signed in yet, so there's no team membership to read a name from —
  // but a ?code= link already points at a specific team, so look its name
  // up directly (get_team_name_by_invite_code is callable by anon for
  // exactly this, same trust model as the invite code itself).
  let teamName: string | null = null;
  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_team_name_by_invite_code", { p_code: code });
    teamName = data ?? null;
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-sm text-center">
        <TeamEyebrow teamName={teamName} size="lg" />
        <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          주 3회 러닝 인증 챌린지
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          카카오 계정으로 바로 시작하세요.
        </p>

        {error && (
          <ErrorBanner className="mt-4">
            로그인에 실패했어요. 다시 시도해 주세요.
            {reason && (
              <span className="mt-1 block text-xs opacity-80">({reason})</span>
            )}
          </ErrorBanner>
        )}

        <div className="mt-8">
          <KakaoInAppBrowserNotice />
          <LoginButton inviteCode={code} />
        </div>
      </div>
    </div>
  );
}
