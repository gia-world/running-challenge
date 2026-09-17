import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminTabs } from "@/components/AdminTabs";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { requireTeamViewer } from "@/lib/viewer";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { viewer } = await requireTeamViewer();

  if (viewer.teamRole !== "admin") {
    redirect("/home");
  }

  const supabase = await createClient();
  const { count: pendingCount } = await supabase
    .from("activities")
    .select("id, seasons!inner(team_id)", { count: "exact", head: true })
    .eq("status", "pending")
    .eq("seasons.team_id", viewer.teamId);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 pb-20 dark:bg-black">
      <PageHeader suffix="ADMIN">
        <AdminTabs pendingCount={pendingCount ?? 0} />
      </PageHeader>

      <main className="mx-auto w-full max-w-md flex-1 px-6 py-6">{children}</main>

      <BottomNav active="admin" isAdmin />
    </div>
  );
}
