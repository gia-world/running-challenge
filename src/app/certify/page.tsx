import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { loadViewerContext } from "@/lib/viewer";
import { todayInSeoul } from "@/lib/week";
import { CertifyForm } from "./CertifyForm";

export default async function CertifyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const viewer = await loadViewerContext(supabase, user.id);

  if (!viewer.teamId) {
    redirect("/join");
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 pb-20 dark:bg-black">
      <PageHeader>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">인증하기</h1>
      </PageHeader>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-6">
        {!viewer.activeSeason ? (
          <p className="mt-10 rounded-xl border-2 border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            지금 진행 중인 시즌이 없어요. 관리자가 시즌을 만들면 인증할 수 있어요.
          </p>
        ) : !viewer.isSeasonMember ? (
          <p className="mt-10 rounded-xl border-2 border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            이번 시즌에는 참여 중이 아니에요. 관리자에게 참여를 요청해주세요.
          </p>
        ) : (
          <CertifyFormLoader userId={user.id} seasonId={viewer.activeSeason.id} />
        )}
      </main>

      <BottomNav active="certify" isAdmin={viewer.teamRole === "admin"} />
    </div>
  );
}

async function CertifyFormLoader({ userId, seasonId }: { userId: string; seasonId: string }) {
  const supabase = await createClient();
  const today = todayInSeoul();

  const { data: todaysActivity } = await supabase
    .from("activities")
    .select("id")
    .eq("user_id", userId)
    .eq("activity_date", today)
    .neq("status", "rejected")
    .limit(1)
    .maybeSingle();

  return (
    <CertifyForm
      userId={userId}
      seasonId={seasonId}
      alreadyCertifiedToday={!!todaysActivity}
    />
  );
}
