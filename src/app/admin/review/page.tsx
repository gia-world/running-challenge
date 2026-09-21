import { createClient } from "@/lib/supabase/server";
import { formatKoreanDate } from "@/lib/format";
import { getSignedPhotoUrls } from "@/lib/photos";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import { ReviewItem } from "./ReviewItem";

type ReviewRequestRow = {
  activity_id: string;
  profiles: { name: string } | null;
  activities: {
    activity_date: string;
    distance_km: number;
    profiles: { name: string } | null;
    activity_photos: { storage_path: string; sort_order: number }[];
    seasons: { settled_at: string | null } | null;
  } | null;
};

export default async function AdminReviewPage() {
  const supabase = await createClient();

  const { data: requests, error } = await supabase
    .from("activity_review_requests")
    .select(
      "activity_id, profiles!requested_by(name), activities(activity_date, distance_km, profiles!user_id(name), activity_photos(storage_path, sort_order), seasons(settled_at))",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .returns<ReviewRequestRow[]>();

  if (error) {
    console.error("[admin/review] failed to load review requests:", error.message);
  }

  const grouped = new Map<
    string,
    { activity: ReviewRequestRow["activities"]; requesterNames: string[] }
  >();
  for (const row of requests ?? []) {
    if (!row.activities) continue;
    // A closed (settled) season no longer accepts review processing, so
    // pending requests under it drop out of the queue entirely.
    if (row.activities.seasons?.settled_at) continue;
    const existing = grouped.get(row.activity_id);
    const requesterName = row.profiles?.name ?? "팀원";
    if (existing) {
      existing.requesterNames.push(requesterName);
    } else {
      grouped.set(row.activity_id, {
        activity: row.activities,
        requesterNames: [requesterName],
      });
    }
  }

  const items = await Promise.all(
    Array.from(grouped.entries()).map(async ([activityId, { activity, requesterNames }]) => ({
      activityId,
      requesterNames,
      activity_date: activity!.activity_date,
      distance_km: activity!.distance_km,
      ownerName: activity!.profiles?.name ?? "러너",
      photoUrls: await getSignedPhotoUrls(supabase, activity!.activity_photos),
    })),
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold text-ink-strong">
        재인증 요청함 ({items.length})
      </h1>

      {items.length === 0 ? (
        <p className="mt-10 text-center text-base text-ink-tertiary">
          재인증 요청이 없어요.
        </p>
      ) : (
        items.map((item) => (
          <div
            key={item.activityId}
            className="overflow-hidden rounded-2xl border border-border bg-surface"
          >
            {item.photoUrls.length > 0 && (
              <PhotoCarousel photoUrls={item.photoUrls} alt="인증샷" />
            )}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between text-base">
                <span className="font-semibold text-ink-strong">
                  {item.ownerName}
                </span>
                <span className="text-ink-secondary">
                  {formatKoreanDate(item.activity_date)} · {Number(item.distance_km).toFixed(1)}km
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-tertiary">
                {item.requesterNames.join(", ")}님이 재인증을 요청했어요
              </p>
              <ReviewItem activityId={item.activityId} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
