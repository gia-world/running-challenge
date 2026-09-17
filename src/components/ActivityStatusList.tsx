import { formatKoreanDate } from "@/lib/format";
import { EmptyState } from "./EmptyState";
import type { ActivityStatus } from "@/lib/types";

export const STATUS_BADGES = {
  approved: { label: "인정", className: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400" },
  pending: { label: "심사중", className: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400" },
  rejected: { label: "반려", className: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400" },
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
      {activities.map((activity) => {
        const badge = STATUS_BADGES[activity.status];
        return (
          <li
            key={activity.id}
            className="flex flex-col gap-1 rounded-xl bg-white px-4 py-3 text-sm shadow-sm dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-zinc-600 dark:text-zinc-300">
                  {formatKoreanDate(activity.activity_date)}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                  {badge.label}
                </span>
              </div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                {Number(activity.distance_km).toFixed(1)}km
              </span>
            </div>
            {activity.status === "rejected" && activity.rejected_reason && (
              <p className="text-xs text-red-500 dark:text-red-400">
                반려 사유: {activity.rejected_reason}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
