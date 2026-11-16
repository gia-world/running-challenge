import { requireTeamViewer } from "@/lib/viewer";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementManager } from "./AnnouncementManager";

type AnnouncementRow = { id: string; body: string; created_at: string };

export default async function AdminAnnouncementsPage() {
  const { user, viewer } = await requireTeamViewer();
  const teamId = viewer.teamId;

  const supabase = await createClient();
  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, body, created_at")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .returns<AnnouncementRow[]>();

  return (
    <AnnouncementManager
      teamId={teamId}
      userId={user.id}
      initialAnnouncements={announcements ?? []}
    />
  );
}
