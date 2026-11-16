import { createClient } from "@/lib/supabase/server";
import { requireTeamViewer } from "@/lib/viewer";
import { formatKoreanDate } from "@/lib/format";
import { PageShell } from "@/components/PageShell";
import { PageTitle } from "@/components/PageTitle";
import { BackLink } from "@/components/BackLink";
import { MarkNotificationsRead } from "@/components/MarkNotificationsRead";

type NotificationRow = {
  id: string;
  type: "comment" | "reply" | "reaction" | "review_request" | "activity_rejected" | "settlement_pending";
  emoji: string | null;
  created_at: string;
  read_at: string | null;
  profiles: { name: string } | null;
  activities: { rejected_reason: string | null } | null;
};

function describeNotification(n: NotificationRow): string {
  const actor = n.profiles?.name ?? "누군가";
  if (n.type === "reaction") return `${actor}님이 회원님 인증에 ${n.emoji ?? "👍"} 반응을 남겼어요`;
  if (n.type === "reply") return `${actor}님이 회원님 댓글에 답글을 남겼어요`;
  if (n.type === "review_request") return `${actor}님이 재인증을 요청했어요`;
  if (n.type === "activity_rejected") {
    const reason = n.activities?.rejected_reason;
    return `인증이 반려됐어요${reason ? ` (사유: ${reason})` : ""}. 새로 업로드해주세요.`;
  }
  if (n.type === "settlement_pending") {
    return "그레이스 기간이 끝났는데 처리할 요청이 남아있어서 시즌이 자동으로 정산되지 않았어요. 확인해주세요!";
  }
  return `${actor}님이 회원님 인증에 댓글을 남겼어요`;
}

export default async function NotificationsPage() {
  const { user, viewer } = await requireTeamViewer();
  const supabase = await createClient();

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id, type, emoji, created_at, read_at, profiles!actor_user_id(name), activities(rejected_reason)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<NotificationRow[]>();

  if (error) {
    console.error("[notifications] failed to load notifications:", error.message);
  }

  const items = notifications ?? [];

  return (
    <PageShell
      teamName={viewer.teamName}
      header={
        <>
          <BackLink href="/feed">← 피드</BackLink>
          <PageTitle className="mt-1">알림</PageTitle>
        </>
      }
      isAdmin={viewer.teamRole === "admin"}
    >
      <MarkNotificationsRead userId={user.id} />

      {items.length === 0 ? (
        <p className="mt-10 text-center text-base text-ink-tertiary">
          아직 알림이 없어요.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={
                n.read_at
                  ? "rounded-2xl border border-border bg-surface px-4 py-3"
                  : "rounded-2xl border border-primary-400 bg-primary-50 px-4 py-3"
              }
            >
              <p className="text-base text-ink">{describeNotification(n)}</p>
              <p className="mt-0.5 text-sm text-ink-tertiary">{formatKoreanDate(n.created_at.slice(0, 10))}</p>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
