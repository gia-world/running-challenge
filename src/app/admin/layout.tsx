import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminTabs } from "@/components/AdminTabs";
import { PageShell } from "@/components/PageShell";
import { PageTitle } from "@/components/PageTitle";
import { requireTeamViewer } from "@/lib/viewer";
import { autoSettleTeamSeasons } from "@/lib/autoSettle";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { viewer } = await requireTeamViewer();

  if (viewer.teamRole !== "admin") {
    redirect("/home");
  }

  const supabase = await createClient();
  await autoSettleTeamSeasons(supabase, viewer.teamId);

  const [{ data: pendingRequests }, { data: pendingDropoutRequests }] = await Promise.all([
    supabase
      .from("activity_review_requests")
      .select("activity_id, activities(seasons(settled_at))")
      .eq("status", "pending")
      .returns<
        {
          activity_id: string;
          activities: { seasons: { settled_at: string | null } | null } | null;
        }[]
      >(),
    supabase
      .from("season_dropout_requests")
      .select("id, seasons(settled_at)")
      .eq("status", "pending")
      .returns<{ id: string; seasons: { settled_at: string | null } | null }[]>(),
  ]);
  // A closed (settled) season no longer accepts review processing, so its
  // pending requests shouldn't inflate the badge either.
  const pendingCount = new Set(
    (pendingRequests ?? [])
      .filter((r) => !r.activities?.seasons?.settled_at)
      .map((r) => r.activity_id),
  ).size;
  const dropoutPendingCount = (pendingDropoutRequests ?? []).filter(
    (r) => !r.seasons?.settled_at,
  ).length;

  return (
    <PageShell
      teamName={viewer.teamName}
      header={<PageTitle>ADMIN</PageTitle>}
      isAdmin
    >
      <AdminTabs pendingCount={pendingCount} dropoutPendingCount={dropoutPendingCount}>
        {children}
      </AdminTabs>
    </PageShell>
  );
}
