import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireTeamViewer } from "@/lib/viewer";
import { formatKoreanDate } from "@/lib/format";
import { todayInSeoul } from "@/lib/week";
import { computeSeasonStatus } from "@/lib/seasonStatus";
import { EmptyState } from "@/components/EmptyState";
import { SeasonForm } from "./SeasonForm";

export default async function AdminSeasonPage() {
  const { viewer } = await requireTeamViewer();
  const teamId = viewer.teamId;

  const supabase = await createClient();
  const { data: seasons } = await supabase
    .from("seasons")
    .select("id, start_date, end_date, settled_at")
    .eq("team_id", teamId)
    .order("start_date", { ascending: false });

  const allSeasons = seasons ?? [];
  const mostRecentSeasonId = allSeasons[0]?.id ?? null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">시즌 관리</h1>

      <SeasonForm
        teamId={teamId}
        existingSeasons={allSeasons}
        previousSeasonId={mostRecentSeasonId}
      />

      <section>
        <h2 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">전체 시즌</h2>
        {allSeasons.length === 0 ? (
          <EmptyState className="mt-2">아직 만든 시즌이 없어요.</EmptyState>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {allSeasons.map((season) => {
              const status = computeSeasonStatus(season, todayInSeoul());
              return (
                <li key={season.id}>
                  <Link
                    href={`/admin/season/${season.id}`}
                    className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-base shadow-sm dark:bg-zinc-900"
                  >
                    <span className="text-zinc-900 dark:text-zinc-50">
                      {formatKoreanDate(season.start_date)} ~ {formatKoreanDate(season.end_date)}
                    </span>
                    {status === "active" && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-sm font-medium text-green-600 dark:bg-green-950 dark:text-green-400">
                        진행중
                      </span>
                    )}
                    {status === "settling" && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-sm font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                        정산중
                      </span>
                    )}
                    {status === "closed" && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-sm font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        시즌 종료
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
