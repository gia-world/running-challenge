import { createClient } from "@/lib/supabase/server";
import { describeSeasonOccurrence } from "@/lib/season";
import { getSignedPhotoUrls, getSignedThumbnailUrls } from "@/lib/photos";
import { isWithinCertificationGrace } from "@/lib/week";

export const FEED_PAGE_SIZE = 10;

type FeedRow = {
  id: string;
  user_id: string;
  season_id: string;
  activity_date: string;
  distance_km: number;
  note: string | null;
  created_at: string;
  profiles: { name: string } | null;
  activity_photos: { storage_path: string; thumbnail_storage_path: string | null; sort_order: number }[];
};

export type FeedItem = {
  id: string;
  isOwnActivity: boolean;
  isSeasonSettled: boolean;
  canDelete: boolean;
  photoUrls: string[];
  thumbnailUrls: string[];
  photoStoragePaths: string[];
  reactions: { emoji: string; count: number; reactedByMe: boolean }[];
  requestedByMe: boolean;
  note: string | null;
  profileName: string | null;
  activityDate: string;
  occurrenceLabel: string | null;
  distanceKm: number;
  createdAt: string;
};

/**
 * Shared feed page loader — used both by the initial server-rendered page
 * and by the "더보기" server action, so the two never drift out of sync.
 * `cursor` (an activity's `created_at`) fetches the page right after it.
 */
export async function loadFeed({
  userId,
  cursor,
}: {
  userId: string;
  cursor?: string;
}): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from("activities")
    .select(
      "id, user_id, season_id, activity_date, distance_km, note, created_at, profiles!user_id(name), activity_photos(storage_path, thumbnail_storage_path, sort_order)",
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: activities, error } = await query.returns<FeedRow[]>();

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
            .select("id, start_date, end_date, settled_at")
            .in("id", seasonIds)
        : Promise.resolve({
            data: [] as {
              id: string;
              start_date: string;
              end_date: string;
              settled_at: string | null;
            }[],
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

  const seasonStartDates = new Map((seasons ?? []).map((s) => [s.id, s.start_date]));
  const seasonEndDates = new Map((seasons ?? []).map((s) => [s.id, s.end_date]));
  const settledSeasonIds = new Set((seasons ?? []).filter((s) => s.settled_at).map((s) => s.id));
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
    if (reaction.user_id === userId) {
      entry.reactedByMe = true;
    }
    emojiMap.set(reaction.emoji, entry);
    reactionsByActivity.set(reaction.activity_id, emojiMap);
  }

  const requestedByMe = new Set(
    (reviewRequests ?? [])
      .filter((request) => request.requested_by === userId)
      .map((request) => request.activity_id),
  );

  const items = await Promise.all(
    rows.map(async (row): Promise<FeedItem> => {
      const [photoUrls, thumbnailUrls] = await Promise.all([
        getSignedPhotoUrls(supabase, row.activity_photos),
        getSignedThumbnailUrls(supabase, row.activity_photos),
      ]);

      const seasonStart = seasonStartDates.get(row.season_id);
      const seasonEnd = seasonEndDates.get(row.season_id);
      const dates = datesByUserSeason.get(`${row.user_id}:${row.season_id}`) ?? [];
      const occurrence = seasonStart
        ? describeSeasonOccurrence(seasonStart, dates, row.activity_date)
        : null;

      return {
        id: row.id,
        isOwnActivity: row.user_id === userId,
        isSeasonSettled: settledSeasonIds.has(row.season_id),
        canDelete: row.user_id === userId && !!seasonEnd && isWithinCertificationGrace(seasonEnd),
        photoUrls,
        thumbnailUrls,
        photoStoragePaths: row.activity_photos.flatMap((p) =>
          p.thumbnail_storage_path ? [p.storage_path, p.thumbnail_storage_path] : [p.storage_path],
        ),
        reactions: Array.from(
          reactionsByActivity.get(row.id) ?? new Map(),
          ([emoji, state]) => ({ emoji, ...state }),
        ),
        requestedByMe: requestedByMe.has(row.id),
        note: row.note,
        profileName: row.profiles?.name ?? null,
        activityDate: row.activity_date,
        occurrenceLabel: occurrence ? `${occurrence.weekIndex + 1}주차 ${occurrence.ordinal}회` : null,
        distanceKm: Number(row.distance_km),
        createdAt: row.created_at,
      };
    }),
  );

  const nextCursor =
    rows.length === FEED_PAGE_SIZE ? rows[rows.length - 1].created_at : null;

  return { items, nextCursor };
}
