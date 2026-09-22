import Link from "next/link";
import { formatKoreanDate } from "@/lib/format";
import { EmptyState } from "./EmptyState";
import type { ActivityStatus } from "@/lib/types";

const REJECTED_BADGE = {
  label: "반려",
  className: "bg-danger-subtle text-danger",
} as const;

export type ActivityListItem = {
  id: string;
  activity_date: string;
  distance_km: number;
  status: ActivityStatus;
  rejected_reason: string | null;
};

/** The viewer's own activities for a week (홈의 이번 주 인증 기록, 시즌 전체 기록의 주차별 목록) — each row links to the activity's detail page. */
export function ActivityStatusList({
  activities,
  emptyMessage,
}: {
  activities: ActivityListItem[];
  emptyMessage: string;
}) {
  if (activities.length === 0) {
    return <EmptyState className="mt-3">{emptyMessage}</EmptyState>;
  }

  return (
    <ul className="mt-3 flex flex-col gap-2">
      {activities.map((activity) => (
        <li key={activity.id}>
          <Link
            href={`/activities/${activity.id}`}
            className="flex flex-col gap-1 rounded-2xl border border-border bg-surface px-4 py-3 text-base"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-ink">
                  {formatKoreanDate(activity.activity_date)}
                </span>
                {activity.status === "rejected" && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-sm font-medium ${REJECTED_BADGE.className}`}
                  >
                    {REJECTED_BADGE.label}
                  </span>
                )}
              </div>
              <span className="font-semibold text-ink-strong">
                {Number(activity.distance_km).toFixed(2)}km
              </span>
            </div>
            {activity.status === "rejected" && activity.rejected_reason && (
              <p className="text-sm text-danger">
                반려 사유: {activity.rejected_reason}
              </p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
