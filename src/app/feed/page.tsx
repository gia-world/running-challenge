import { FeedList } from "@/components/FeedList";
import { PageShell } from "@/components/PageShell";
import { PageTitle } from "@/components/PageTitle";
import { SeasonGate } from "@/components/SeasonGate";
import { requireTeamViewer } from "@/lib/viewer";
import { loadFeed } from "./loadFeed";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ activity?: string }>;
}) {
  const { user, viewer } = await requireTeamViewer();
  const { activity } = await searchParams;
  const isAdmin = viewer.teamRole === "admin";

  return (
    <PageShell
      teamName={viewer.teamName}
      header={<PageTitle>피드</PageTitle>}
      isAdmin={isAdmin}
      activeTab="feed"
    >
      {/* 관리자는 이번 시즌에 참여하지 않았어도(season_memberships에
          없어도) 팀 피드는 전부 볼 수 있어야 한다. */}
      <SeasonGate viewer={{ ...viewer, isSeasonMember: viewer.isSeasonMember || isAdmin }}>
        <Feed userId={user.id} highlightActivityId={activity} />
      </SeasonGate>
    </PageShell>
  );
}

async function Feed({
  userId,
  highlightActivityId,
}: {
  userId: string;
  highlightActivityId?: string;
}) {
  const { items, nextCursor } = await loadFeed({ userId, highlightActivityId });

  if (items.length === 0) {
    return (
      <p className="mt-10 text-center text-base text-ink-tertiary">아직 인증된 기록이 없어요.</p>
    );
  }

  return (
    <FeedList
      initialItems={items}
      initialNextCursor={nextCursor}
      currentUserId={userId}
      autoOpenActivityId={highlightActivityId}
    />
  );
}
