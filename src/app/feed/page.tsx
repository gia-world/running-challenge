import { createClient } from "@/lib/supabase/server";
import { FeedCardActions } from "@/components/FeedCardActions";
import { PageShell } from "@/components/PageShell";
import { PageTitle } from "@/components/PageTitle";
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

  const [{ data: seasons }, { data: allApproved }, { data: reactions }, { data: reviewRequests }] =
    await Promise.all([
      seasonIds.length > 0
        ? supabase
            .from("seasons")
            .select("id, start_date, settled_at")
            .in("id", seasonIds)
        : Promise.resolve({
            data: [] as { id: string; start_date: string; settled_at: string | null }[],
          }),
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
            .from("activity_reactions")
            .select("activity_id, user_id, emoji")
            .in("activity_id", activityIds)
        : Promise.resolve({
            data: [] as { activity_id: string; user_id: string; emoji: string }[],
          }),
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
  const settledSeasonIds = new Set(
    (seasons ?? []).filter((s) => s.settled_at).map((s) => s.id),
  );
  const datesByUserSeason = new Map<string, string[]>();
  for (const activity of allApproved ?? []) {
    const key = `${activity.user_id}:${activity.season_id}`;
    const dates = datesByUserSeason.get(key) ?? [];
    dates.push(activity.activity_date);
    datesByUserSeason.set(key, dates);
  }

  const reactionsByActivity = new Map<string, Map<string, { count: number; reactedByMe: boolean }>>();
  for (const reaction of reactions ?? []) {
    const emojiMap = reactionsByActivity.get(reaction.activity_id) ?? new Map();
    const entry = emojiMap.get(reaction.emoji) ?? { count: 0, reactedByMe: false };
    entry.count += 1;
    if (reaction.user_id === user.id) {
      entry.reactedByMe = true;
    }
    emojiMap.set(reaction.emoji, entry);
    reactionsByActivity.set(reaction.activity_id, emojiMap);
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
        reactions: Array.from(
          reactionsByActivity.get(row.id) ?? new Map(),
          ([emoji, state]) => ({ emoji, ...state }),
        ),
        requestedByMe: requestedByMe.has(row.id),
        isSeasonSettled: settledSeasonIds.has(row.season_id),
      };
    }),
  );

  return (
    <PageShell
      teamName={viewer.teamName}
      header={<PageTitle>피드</PageTitle>}
      bottomNav={{ active: "feed", isAdmin: viewer.teamRole === "admin" }}
    >
      {items.length === 0 ? (
          <p className="mt-10 text-center text-base text-ink-tertiary">
            아직 인증된 기록이 없어요.
          </p>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-border bg-surface"
            >
              {item.photoUrls.length > 0 && (
                <PhotoCarousel photoUrls={item.photoUrls} alt="인증샷" />
              )}
              <div className="flex items-center justify-between px-4 py-3 text-base">
                <p>
                  <span className="font-semibold text-ink-strong">
                    {item.profiles?.name ?? "러너"}
                  </span>
                  {" · "}
                  {item.occurrenceLabel && (
                    <span className="text-sm font-medium text-primary">
                      {item.occurrenceLabel}
                    </span>
                  )}
                </p>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-ink-secondary">
                    {formatKoreanDate(item.activity_date)} ·{" "}
                    {Number(item.distance_km).toFixed(2)}km
                  </span>
                </div>
              </div>
              <FeedCardActions
                activityId={item.id}
                currentUserId={user.id}
                isOwnActivity={item.user_id === user.id}
                isSeasonSettled={item.isSeasonSettled}
                initialReactions={item.reactions}
                initialRequested={item.requestedByMe}
              />
            </article>
          ))
        )}
    </PageShell>
  );
}
