import { createClient } from "@/lib/supabase/server";
import { formatKoreanDate } from "@/lib/format";
import { DropoutRequestItem } from "./DropoutRequestItem";

type DropoutRequestRow = {
  id: string;
  season_id: string;
  user_id: string;
  reason: string | null;
  created_at: string;
  profiles: { name: string } | null;
  seasons: {
    start_date: string;
    end_date: string;
    settled_at: string | null;
    entry_fee: number | null;
  } | null;
};

export default async function AdminDropoutPage() {
  const supabase = await createClient();

  const { data: requests, error } = await supabase
    .from("season_dropout_requests")
    .select(
      "id, season_id, user_id, reason, created_at, profiles!user_id(name), seasons(start_date, end_date, settled_at, entry_fee)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .returns<DropoutRequestRow[]>();

  if (error) {
    console.error("[admin/dropout] failed to load dropout requests:", error.message);
  }

  // A closed (settled) season no longer accepts dropout processing, so
  // pending requests under it drop out of the queue entirely — mirrors
  // admin/review's same guard for review requests.
  const items = (requests ?? []).filter((r) => !r.seasons?.settled_at);

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <p className="mt-10 text-center text-base text-ink-tertiary">
          중도하차 요청이 없어요.
        </p>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-border bg-surface px-4 py-3"
          >
            <div className="flex items-center justify-between text-base">
              <span className="font-semibold text-ink-strong">
                {item.profiles?.name ?? "팀원"}
              </span>
              {item.seasons && (
                <span className="text-ink-secondary">
                  {formatKoreanDate(item.seasons.start_date)} ~{" "}
                  {formatKoreanDate(item.seasons.end_date)}
                </span>
              )}
            </div>
            {item.reason && (
              <p className="mt-1 text-sm text-ink-secondary">{item.reason}</p>
            )}
            <DropoutRequestItem
              requestId={item.id}
              seasonId={item.season_id}
              userId={item.user_id}
              memberName={item.profiles?.name ?? "팀원"}
              maxSettlementAmount={item.seasons?.entry_fee ?? null}
            />
          </div>
        ))
      )}
    </div>
  );
}
