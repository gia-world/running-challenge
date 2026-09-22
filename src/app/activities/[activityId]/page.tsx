import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTeamViewer } from "@/lib/viewer";
import { describeSeasonOccurrence } from "@/lib/season";
import { getSignedPhotoUrls } from "@/lib/photos";
import { isWithinCertificationGrace } from "@/lib/week";
import { BackButton } from "@/components/BackButton";
import { ActivityDetailView } from "@/components/ActivityDetailView";

type ActivityRow = {
  id: string;
  user_id: string;
  season_id: string;
  activity_date: string;
  distance_km: number;
  profiles: { name: string } | null;
  seasons: { start_date: string; end_date: string; settled_at: string | null } | null;
  activity_photos: { storage_path: string; sort_order: number }[];
};

/**
 * "카드를 크게 본다"는 피드/홈/전체기록 공통 요청을 실제 페이지 네비게이션으로
 * 구현한다 — 오버레이 모달 대신 진짜 라우트라서, 뒤로가기가 자연스럽고
 * 다크 테마를 따로 만들 필요 없이 앱 전체가 쓰는 흰 캔버스/카드 스타일을
 * 그대로 물려받는다.
 */
export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ activityId: string }>;
}) {
  const { activityId } = await params;
  const { user } = await requireTeamViewer();
  const supabase = await createClient();

  const { data: activity } = await supabase
    .from("activities")
    .select(
      "id, user_id, season_id, activity_date, distance_km, profiles!user_id(name), seasons(start_date, end_date, settled_at), activity_photos(storage_path, sort_order)",
    )
    .eq("id", activityId)
    .maybeSingle<ActivityRow>();

  // RLS already limits this to activities the viewer's allowed to see (own,
  // or approved within their team) — a missing row here means either it
  // doesn't exist or the viewer isn't allowed to see it, same response either way.
  if (!activity || !activity.seasons) {
    notFound();
  }

  const [{ data: approvedDates }, { data: reactions }, { data: reviewRequests }] =
    await Promise.all([
      supabase
        .from("activities")
        .select("activity_date")
        .eq("user_id", activity.user_id)
        .eq("season_id", activity.season_id)
        .eq("status", "approved"),
      supabase.from("activity_reactions").select("user_id, emoji").eq("activity_id", activityId),
      supabase
        .from("activity_review_requests")
        .select("requested_by")
        .eq("activity_id", activityId)
        .eq("status", "pending"),
    ]);

  const photoUrls = await getSignedPhotoUrls(supabase, activity.activity_photos);
  const photoStoragePaths = activity.activity_photos.map((p) => p.storage_path);

  const occurrence = describeSeasonOccurrence(
    activity.seasons.start_date,
    (approvedDates ?? []).map((a) => a.activity_date),
    activity.activity_date,
  );
  const occurrenceLabel = occurrence
    ? `${occurrence.weekIndex + 1}주차 ${occurrence.ordinal}회`
    : null;

  const reactionsByEmoji = new Map<string, { count: number; reactedByMe: boolean }>();
  for (const r of reactions ?? []) {
    const entry = reactionsByEmoji.get(r.emoji) ?? { count: 0, reactedByMe: false };
    entry.count += 1;
    if (r.user_id === user.id) entry.reactedByMe = true;
    reactionsByEmoji.set(r.emoji, entry);
  }

  const isOwnActivity = activity.user_id === user.id;
  const isSeasonSettled = !!activity.seasons.settled_at;
  const canDelete = isOwnActivity && isWithinCertificationGrace(activity.seasons.end_date);
  const requestedByMe = (reviewRequests ?? []).some((r) => r.requested_by === user.id);

  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <div className="px-4 py-3">
        <BackButton>← 뒤로</BackButton>
      </div>
      <div className="mx-auto w-full max-w-md flex-1 px-4 pb-8">
        <ActivityDetailView
          activityId={activity.id}
          currentUserId={user.id}
          isOwnActivity={isOwnActivity}
          isSeasonSettled={isSeasonSettled}
          canDelete={canDelete}
          photoUrls={photoUrls}
          photoStoragePaths={photoStoragePaths}
          initialReactions={Array.from(reactionsByEmoji, ([emoji, state]) => ({
            emoji,
            ...state,
          }))}
          initialRequested={requestedByMe}
          ownerName={activity.profiles?.name ?? "러너"}
          activityDate={activity.activity_date}
          distanceKm={Number(activity.distance_km)}
          occurrenceLabel={occurrenceLabel}
        />
      </div>
    </div>
  );
}
