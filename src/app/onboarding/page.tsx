import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { TeamEyebrow } from "@/components/TeamEyebrow";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, name_confirmed")
    .eq("id", user.id)
    .single();

  if (profile?.name_confirmed) {
    redirect("/home");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm text-center">
        <TeamEyebrow size="lg" />
        <h1 className="mt-2 text-2xl font-bold text-ink-strong">
          이름을 확인해주세요
        </h1>
        <p className="mt-2 text-base text-ink-secondary">
          팀원들에게는 이 이름으로 보여요.
        </p>

        <div className="mt-8">
          <OnboardingForm userId={user.id} currentName={profile?.name ?? "러너"} />
        </div>
      </div>
    </div>
  );
}
