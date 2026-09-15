import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";
import { CrewEyebrow } from "@/components/CrewEyebrow";
import { CertifyForm } from "./CertifyForm";

export default async function CertifyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 pb-20 dark:bg-black">
      <header className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <CrewEyebrow />
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">인증하기</h1>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-6">
        <CertifyForm userId={user.id} />
      </main>

      <BottomNav active="certify" isAdmin={profile?.role === "admin"} />
    </div>
  );
}
