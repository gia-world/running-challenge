import { FeedList } from "@/components/FeedList";
import { PageShell } from "@/components/PageShell";
import { PageTitle } from "@/components/PageTitle";
import { SeasonGate } from "@/components/SeasonGate";
import { requireTeamViewer } from "@/lib/viewer";
import { loadFeed } from "./loadFeed";

export default async function FeedPage() {
  const { user, viewer } = await requireTeamViewer();

  return (
    <PageShell
      teamName={viewer.teamName}
      header={<PageTitle>피드</PageTitle>}
      isAdmin={viewer.teamRole === "admin"}
      activeTab="feed"
    >
      <SeasonGate viewer={viewer}>
        <Feed userId={user.id} />
      </SeasonGate>
    </PageShell>
  );
}

async function Feed({ userId }: { userId: string }) {
  const { items, nextCursor } = await loadFeed({ userId });

  if (items.length === 0) {
    return (
      <p className="mt-10 text-center text-base text-ink-tertiary">
        아직 인증된 기록이 없어요.
      </p>
    );
  }

  return <FeedList initialItems={items} initialNextCursor={nextCursor} currentUserId={userId} />;
}
