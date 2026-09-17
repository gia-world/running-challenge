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
  const { data: pendingRequests } = await supabase
    .from("activity_review_requests")
    .select("activity_id")
    .eq("status", "pending");
  const pendingCount = new Set((pendingRequests ?? []).map((r) => r.activity_id)).size;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 pb-20 dark:bg-black">
      <PageHeader teamName={viewer.teamName} suffix="ADMIN">
        <AdminTabs pendingCount={pendingCount} />
      </PageHeader>

      <main className="mx-auto w-full max-w-md flex-1 px-6 py-6">{children}</main>

      <BottomNav active="admin" isAdmin />
    </div>
  );
}
