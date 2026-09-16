import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { formatKoreanDate } from "@/lib/format";

const PHOTO_SIGNED_URL_TTL_SECONDS = 60 * 60;
const FEED_LIMIT = 50;

type FeedRow = {
  id: string;
  activity_date: string;
  distance_km: number;
  photo_url: string;
  profiles: { name: string } | null;
};

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const { data: activities, error } = await supabase
    .from("activities")
    .select("id, activity_date, distance_km, photo_url, profiles!user_id(name)")
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
      const { data } = await supabase.storage
        .from("certifications")
        .createSignedUrl(row.photo_url, PHOTO_SIGNED_URL_TTL_SECONDS);
      return { ...row, signedUrl: data?.signedUrl ?? null };
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
              {item.signedUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.signedUrl}
                  alt="인증샷"
                  className="aspect-square w-full object-cover"
                />
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

      <BottomNav active="feed" isAdmin={profile?.role === "admin"} />
    </div>
  );
}
