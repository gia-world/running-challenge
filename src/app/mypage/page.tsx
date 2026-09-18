import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { requireTeamViewer } from "@/lib/viewer";
import { BankForm } from "./BankForm";

export default async function MyPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }
  const { viewer } = await requireTeamViewer();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, bank_name, bank_account_number")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <PageHeader teamName={viewer.teamName}>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">마이페이지</h1>
      </PageHeader>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-8">
        <div>
          <h2 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
            {profile?.name ?? "러너"}
          </h2>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">계좌 정보</h2>
          <p className="text-base text-zinc-500 dark:text-zinc-400">
            환급/상금을 받을 계좌를 등록해두면 담당자가 이체할 때 따로 물어보지 않아도 돼요.
          </p>
          <BankForm
            userId={user.id}
            initialBankName={profile?.bank_name ?? ""}
            initialAccountNumber={profile?.bank_account_number ?? ""}
          />
        </div>

        <Link
          href="/home"
          className="text-sm font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          ← 홈으로
        </Link>
      </main>
    </div>
  );
}
