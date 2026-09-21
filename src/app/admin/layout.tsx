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
    .select("activity_id, activities(seasons(settled_at))")
    .eq("status", "pending")
    .returns<
      { activity_id: string; activities: { seasons: { settled_at: string | null } | null } | null }[]
    >();
  // A closed (settled) season no longer accepts review processing, so its
  // pending requests shouldn't inflate the badge either.
  const pendingCount = new Set(
    (pendingRequests ?? [])
      .filter((r) => !r.activities?.seasons?.settled_at)
      .map((r) => r.activity_id),
  ).size;

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
