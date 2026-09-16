import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadViewerContext } from "@/lib/viewer";
import { formatKoreanDate } from "@/lib/format";
import { SeasonForm } from "./SeasonForm";

export default async function AdminSeasonPage() {
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
  const teamId = viewer.teamId;

  const { data: seasons } = await supabase
    .from("seasons")
    .select("id, start_date, end_date")
    .eq("team_id", teamId)
    .order("start_date", { ascending: false });

  const allSeasons = seasons ?? [];
  const mostRecentSeasonId = allSeasons[0]?.id ?? null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">시즌 관리</h1>

      {viewer.activeSeason ? (
        <section className="rounded-2xl bg-orange-50 p-4 dark:bg-orange-950">
          <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
            진행 중인 시즌
          </p>
          <p className="mt-1 font-bold text-zinc-900 dark:text-zinc-50">
            {formatKoreanDate(viewer.activeSeason.start_date)} ~{" "}
            {formatKoreanDate(viewer.activeSeason.end_date)}
          </p>
        </section>
      ) : (
        <p className="rounded-2xl border-2 border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          지금 진행 중인 시즌이 없어요.
        </p>
      )}

      <SeasonForm
        teamId={teamId}
        existingSeasons={allSeasons}
        previousSeasonId={mostRecentSeasonId}
      />

      {allSeasons.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">지난 시즌</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {allSeasons.map((season) => (
              <li
                key={season.id}
                className="rounded-xl bg-white px-4 py-3 text-sm shadow-sm dark:bg-zinc-900"
              >
                {formatKoreanDate(season.start_date)} ~ {formatKoreanDate(season.end_date)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
