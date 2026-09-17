import { createClient } from "@/lib/supabase/server";
import { formatKoreanDate } from "@/lib/format";
import { getSignedPhotoUrls } from "@/lib/photos";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import { ReviewItem } from "./ReviewItem";

type PendingRow = {
  id: string;
  activity_date: string;
  distance_km: number;
  profiles: { name: string } | null;
  activity_photos: { storage_path: string; sort_order: number }[];
};

export default async function AdminReviewPage() {
  const supabase = await createClient();

  const { data: activities, error } = await supabase
    .from("activities")
    .select(
      "id, activity_date, distance_km, profiles!user_id(name), activity_photos(storage_path, sort_order)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .returns<PendingRow[]>();

  if (error) {
    console.error("[admin/review] failed to load pending activities:", error.message);
  }

  const rows = activities ?? [];
  const items = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      photoUrls: await getSignedPhotoUrls(supabase, row.activity_photos),
    })),
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
        심사 대기 ({items.length})
      </h1>

      {items.length === 0 ? (
        <p className="mt-10 text-center text-sm text-zinc-400 dark:text-zinc-600">
          심사할 인증이 없어요.
        </p>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-zinc-900"
          >
            {item.photoUrls.length > 0 && (
              <PhotoCarousel photoUrls={item.photoUrls} alt="인증샷" />
            )}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {item.profiles?.name ?? "러너"}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {formatKoreanDate(item.activity_date)} · {Number(item.distance_km).toFixed(1)}km
                </span>
              </div>
              <ReviewItem activityId={item.id} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
