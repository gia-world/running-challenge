import { createClient } from "@/lib/supabase/server";
import { requireTeamViewer } from "@/lib/viewer";
import { InviteCodeCard } from "./InviteCodeCard";
import { MemberRow } from "./MemberRow";

type MembershipRow = {
  id: string;
  role: "admin" | "crew";
  profiles: { id: string; name: string } | null;
};

export default async function AdminMembersPage() {
  const { viewer } = await requireTeamViewer();
  const teamId = viewer.teamId;

  const supabase = await createClient();
  const { data: team } = await supabase
    .from("teams")
    .select("id, name, invite_code")
    .eq("id", teamId)
    .single();

  const { data: memberships } = await supabase
    .from("team_memberships")
    .select("id, role, profiles!user_id(id, name)")
    .eq("team_id", teamId)
    .order("role", { ascending: true })
    .returns<MembershipRow[]>();

  const members = memberships ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          팀원 관리 ({members.length}명)
        </h1>
      </div>

      {team && <InviteCodeCard teamId={team.id} initialCode={team.invite_code} />}

      <ul className="flex flex-col gap-2">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            membershipId={member.id}
            name={member.profiles?.name ?? "러너"}
            role={member.role}
          />
        ))}
      </ul>
    </div>
  );
}
