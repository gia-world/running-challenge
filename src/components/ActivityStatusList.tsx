import { formatKoreanDate } from "@/lib/format";
import { EmptyState } from "./EmptyState";
import type { ActivityStatus } from "@/lib/types";

const REJECTED_BADGE = {
  label: "반려",
  className: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
} as const;

export type ActivityListItem = {
  id: string;
  activity_date: string;
  distance_km: number;
  status: ActivityStatus;
  rejected_reason: string | null;
};

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
        <li
          key={activity.id}
          className="flex flex-col gap-1 rounded-xl bg-white px-4 py-3 text-base shadow-sm dark:bg-zinc-900"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-zinc-600 dark:text-zinc-300">
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
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              {Number(activity.distance_km).toFixed(1)}km
            </span>
          </div>
          {activity.status === "rejected" && activity.rejected_reason && (
            <p className="text-sm text-red-500 dark:text-red-400">
              반려 사유: {activity.rejected_reason}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
