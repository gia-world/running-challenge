import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import { formatKoreanDate } from "@/lib/format";
import { loadViewerContext } from "@/lib/viewer";

const PHOTO_SIGNED_URL_TTL_SECONDS = 60 * 60;
const FEED_LIMIT = 50;

type FeedRow = {
  id: string;
  activity_date: string;
  distance_km: number;
  profiles: { name: string } | null;
  activity_photos: { storage_path: string; sort_order: number }[];
};

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const viewer = await loadViewerContext(supabase, user.id);

  if (!viewer.teamId) {
    redirect("/join");
  }

  const { data: activities, error } = await supabase
    .from("activities")
    .select(
      "id, activity_date, distance_km, profiles!user_id(name), activity_photos(storage_path, sort_order)",
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(FEED_LIMIT)
    .returns<FeedRow[]>();

  if (error) {
    console.error("[feed] failed to load approved activities:", error.message);
  }

  const rows = activities ?? [];
  const items = await Promise.all(
    rows.map(async (row) => {
      const sortedPhotos = [...row.activity_photos].sort((a, b) => a.sort_order - b.sort_order);
      const signedUrls = await Promise.all(
        sortedPhotos.map(async (photo) => {
          const { data } = await supabase.storage
            .from("certifications")
            .createSignedUrl(photo.storage_path, PHOTO_SIGNED_URL_TTL_SECONDS);
          return data?.signedUrl ?? null;
        }),
      );
      return { ...row, photoUrls: signedUrls.filter((url): url is string => !!url) };
    }),
  );

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 pb-20 dark:bg-black">
      <PageHeader>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">피드</h1>
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
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {item.profiles?.name ?? "러너"}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {formatKoreanDate(item.activity_date)} · {Number(item.distance_km).toFixed(1)}km
                </span>
              </div>
            </article>
          ))
        )}
      </main>

      <BottomNav active="feed" isAdmin={viewer.teamRole === "admin"} />
    </div>
  );
}
