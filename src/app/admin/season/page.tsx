import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireTeamViewer } from "@/lib/viewer";
import { formatKoreanDate } from "@/lib/format";
import { todayInSeoul } from "@/lib/week";
import { computeSeasonStatus } from "@/lib/seasonStatus";
import { EmptyState } from "@/components/EmptyState";
import { PageTitle } from "@/components/PageTitle";
import { SectionTitle } from "@/components/SectionTitle";
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
      <PageTitle>시즌 관리</PageTitle>

      <SeasonForm
        teamId={teamId}
        existingSeasons={allSeasons}
        previousSeasonId={mostRecentSeasonId}
      />

      <section>
        <SectionTitle>전체 시즌</SectionTitle>
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
                    className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-base"
                  >
                    <span className="text-ink-strong">
                      {formatKoreanDate(season.start_date)} ~ {formatKoreanDate(season.end_date)}
                    </span>
                    {status === "active" && (
                      <span className="rounded-full bg-success-subtle px-2 py-0.5 text-sm font-medium text-success">
                        진행중
                      </span>
                    )}
                    {status === "settling" && (
                      <span className="rounded-full bg-warning-subtle px-2 py-0.5 text-sm font-medium text-warning">
                        정산중
                      </span>
                    )}
                    {status === "closed" && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-sm font-medium text-ink-secondary">
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
