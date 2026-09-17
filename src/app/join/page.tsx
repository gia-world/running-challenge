import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { TeamEyebrow } from "@/components/TeamEyebrow";
import { JoinForm } from "./JoinForm";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("team_memberships")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership) {
    redirect("/home");
  }

  const { code } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-sm text-center">
        <TeamEyebrow size="lg" />
        <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          팀에 참여하세요
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          관리자에게 받은 초대 코드나 링크로 참여할 수 있어요.
        </p>

        <div className="mt-8">
          <JoinForm initialCode={code} />
        </div>
      </div>
    </div>
  );
}
