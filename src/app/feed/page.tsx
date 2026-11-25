import { FeedList } from "@/components/FeedList";
import { PageShell } from "@/components/PageShell";
import { PageTitle } from "@/components/PageTitle";
import { SeasonGate } from "@/components/SeasonGate";
import { requireTeamViewer } from "@/lib/viewer";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const [{ items, nextCursor }, { data: profile }] = await Promise.all([
    loadFeed({ userId, highlightActivityId }),
    // 댓글 작성 시 등록 결과를 기다리지 않고 바로 화면에 보여주려면(낙관적
    // 업데이트) 작성자 이름이 클라이언트에 미리 있어야 한다.
    supabase.from("profiles").select("name").eq("id", userId).single(),
  ]);

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
      currentUserName={profile?.name ?? null}
      autoOpenActivityId={highlightActivityId}
    />
  );
}
