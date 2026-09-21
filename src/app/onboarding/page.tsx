import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { TeamEyebrow } from "@/components/TeamEyebrow";
import { CenteredPage } from "@/components/CenteredPage";
import { PageTitle } from "@/components/PageTitle";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const { code } = await searchParams;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, name_confirmed")
    .eq("id", user.id)
    .single();

  if (profile?.name_confirmed) {
    redirect(code ? `/join?code=${encodeURIComponent(code)}` : "/home");
  }

  return (
    <CenteredPage>
      <div className="w-full max-w-sm text-center">
        <TeamEyebrow size="lg" />
        <PageTitle size="lg" className="mt-2">
          이름을 확인해주세요
        </PageTitle>
        <p className="mt-2 text-base text-ink-secondary">
          팀원들에게는 이 이름으로 보여요.
        </p>

        <div className="mt-8">
          <OnboardingForm userId={user.id} currentName={profile?.name ?? "러너"} inviteCode={code} />
        </div>
      </div>
    </CenteredPage>
  );
}
