import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginButton } from "./LoginButton";
import { KakaoInAppBrowserNotice } from "./KakaoInAppBrowserNotice";
import { CrewEyebrow } from "@/components/CrewEyebrow";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/home");
  }

  const { error, reason } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-sm text-center">
        <CrewEyebrow size="lg" />
        <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          주 3회 러닝 인증 챌린지
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          카카오 계정으로 바로 시작하세요.
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            로그인에 실패했어요. 다시 시도해 주세요.
            {reason && (
              <span className="mt-1 block text-xs opacity-80">({reason})</span>
            )}
          </p>
        )}

        <div className="mt-8">
          <KakaoInAppBrowserNotice />
          <LoginButton />
        </div>
      </div>
    </div>
  );
}
