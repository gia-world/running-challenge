import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { TeamEyebrow } from "@/components/TeamEyebrow";
import { CenteredPage } from "@/components/CenteredPage";
import { PageTitle } from "@/components/PageTitle";
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

  let teamName: string | null = null;
  if (code) {
    const { data } = await supabase.rpc("get_team_name_by_invite_code", { p_code: code });
    teamName = data ?? null;
  }

  return (
    <CenteredPage>
      <div className="w-full max-w-sm text-center">
        <TeamEyebrow teamName={teamName} size="lg" />
        <PageTitle size="lg" className="mt-2">
          팀에 참여하세요
        </PageTitle>
        <p className="mt-2 text-base text-ink-secondary">
          관리자에게 받은 초대 코드나 링크로 참여할 수 있어요.
        </p>

        <div className="mt-8">
          <JoinForm initialCode={code} />
        </div>
      </div>
    </CenteredPage>
  );
}
