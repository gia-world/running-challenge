import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";
import { FeedCardActions } from "@/components/FeedCardActions";
import { PageHeader } from "@/components/PageHeader";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import { formatKoreanDate } from "@/lib/format";
import { describeSeasonOccurrence } from "@/lib/season";
import { getSignedPhotoUrls } from "@/lib/photos";
import { requireTeamViewer } from "@/lib/viewer";

const FEED_LIMIT = 50;

type FeedRow = {
  id: string;
  user_id: string;
  season_id: string;
  activity_date: string;
  distance_km: number;
  profiles: { name: string } | null;
  activity_photos: { storage_path: string; sort_order: number }[];
};

export default async function FeedPage() {
  const { user, viewer } = await requireTeamViewer();

  const supabase = await createClient();
  const { data: activities, error } = await supabase
    .from("activities")
    .select(
      "id, user_id, season_id, activity_date, distance_km, profiles!user_id(name), activity_photos(storage_path, sort_order)",
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(FEED_LIMIT)
    .returns<FeedRow[]>();

  if (error) {
    console.error("[feed] failed to load approved activities:", error.message);
  }

  const rows = activities ?? [];
  const seasonIds = Array.from(new Set(rows.map((row) => row.season_id)));
  const activityIds = rows.map((row) => row.id);

  const [{ data: seasons }, { data: allApproved }, { data: likes }, { data: reviewRequests }] =
    await Promise.all([
      seasonIds.length > 0
        ? supabase.from("seasons").select("id, start_date").in("id", seasonIds)
        : Promise.resolve({ data: [] as { id: string; start_date: string }[] }),
      seasonIds.length > 0
        ? supabase
            .from("activities")
            .select("user_id, season_id, activity_date")
            .eq("status", "approved")
            .in("season_id", seasonIds)
        : Promise.resolve({
            data: [] as {
              user_id: string;
              season_id: string;
              activity_date: string;
            }[],
          }),
      activityIds.length > 0
        ? supabase
            .from("activity_likes")
            .select("activity_id, user_id")
            .in("activity_id", activityIds)
        : Promise.resolve({ data: [] as { activity_id: string; user_id: string }[] }),
      activityIds.length > 0
        ? supabase
            .from("activity_review_requests")
            .select("activity_id, requested_by")
            .eq("status", "pending")
            .in("activity_id", activityIds)
        : Promise.resolve({
            data: [] as { activity_id: string; requested_by: string }[],
          }),
    ]);

  const seasonStartDates = new Map(
    (seasons ?? []).map((s) => [s.id, s.start_date]),
  );
  const datesByUserSeason = new Map<string, string[]>();
  for (const activity of allApproved ?? []) {
    const key = `${activity.user_id}:${activity.season_id}`;
    const dates = datesByUserSeason.get(key) ?? [];
    dates.push(activity.activity_date);
    datesByUserSeason.set(key, dates);
  }

  const likeCountByActivity = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const like of likes ?? []) {
    likeCountByActivity.set(
      like.activity_id,
      (likeCountByActivity.get(like.activity_id) ?? 0) + 1,
    );
    if (like.user_id === user.id) {
      likedByMe.add(like.activity_id);
    }
  }

  const requestedByMe = new Set(
    (reviewRequests ?? [])
      .filter((request) => request.requested_by === user.id)
      .map((request) => request.activity_id),
  );

  const items = await Promise.all(
    rows.map(async (row) => {
      const photoUrls = await getSignedPhotoUrls(supabase, row.activity_photos);

      const seasonStart = seasonStartDates.get(row.season_id);
      const dates =
        datesByUserSeason.get(`${row.user_id}:${row.season_id}`) ?? [];
      const occurrence = seasonStart
        ? describeSeasonOccurrence(seasonStart, dates, row.activity_date)
        : null;

      return {
        ...row,
        photoUrls,
        occurrenceLabel: occurrence
          ? `${occurrence.weekIndex + 1}주차 ${occurrence.ordinal}회`
          : null,
        likeCount: likeCountByActivity.get(row.id) ?? 0,
        likedByMe: likedByMe.has(row.id),
        requestedByMe: requestedByMe.has(row.id),
      };
    }),
  );

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 pb-20 dark:bg-black">
      <PageHeader teamName={viewer.teamName}>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          피드
        </h1>
      </PageHeader>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-6">
        {items.length === 0 ? (
          <p className="mt-10 text-center text-sm text-zinc-400 dark:text-zinc-600">
            아직 인증된 기록이 없어요.
          </p>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-zinc-900"
            >
              {item.photoUrls.length > 0 && (
                <PhotoCarousel photoUrls={item.photoUrls} alt="인증샷" />
              )}
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <p>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {item.profiles?.name ?? "러너"}
                  </span>
                  {" · "}
                  {item.occurrenceLabel && (
                    <span className="text-xs font-medium text-orange-500">
                      {item.occurrenceLabel}
                    </span>
                  )}
                </p>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {formatKoreanDate(item.activity_date)} ·{" "}
                    {Number(item.distance_km).toFixed(1)}km
                  </span>
                </div>
              </div>
              <FeedCardActions
                activityId={item.id}
                currentUserId={user.id}
                isOwnActivity={item.user_id === user.id}
                initialLiked={item.likedByMe}
                initialLikeCount={item.likeCount}
                initialRequested={item.requestedByMe}
              />
            </article>
          ))
        )}
      </main>

      <BottomNav active="feed" isAdmin={viewer.teamRole === "admin"} />
    </div>
  );
}
