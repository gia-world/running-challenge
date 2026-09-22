"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CERTIFICATIONS_BUCKET } from "@/lib/photos";
import { formatKoreanDate } from "@/lib/format";
import { EmptyState } from "./EmptyState";
import { PhotoViewerModal } from "./PhotoViewerModal";
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
  photoUrls: string[];
  photoStoragePaths: string[];
};

/**
 * The viewer's own activities for a week (홈의 이번 주 인증 기록, 시즌 전체
 * 기록의 주차별 목록) — every entry here is always the signed-in user's own,
 * so unlike the feed, ownership doesn't need to be checked per item. `canDelete`
 * is one shared flag for the whole list (the season's certification grace
 * window), not per-activity.
 */
export function ActivityStatusList({
  activities,
  emptyMessage,
  canDelete,
}: {
  activities: ActivityListItem[];
  emptyMessage: string;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [openActivityId, setOpenActivityId] = useState<string | null>(null);

  if (activities.length === 0) {
    return <EmptyState className="mt-3">{emptyMessage}</EmptyState>;
  }

  const openActivity = activities.find((a) => a.id === openActivityId) ?? null;

  async function deleteActivity(activity: ActivityListItem) {
    const supabase = createClient();
    const { error } = await supabase.from("activities").delete().eq("id", activity.id);
    if (error) {
      console.error("[activity] delete failed:", error.message);
      throw error;
    }

    // Best-effort — the activity row is already gone (the part everyone
    // else sees), so a leftover storage file just wastes space rather
    // than leaving anything inconsistent for the user.
    if (activity.photoStoragePaths.length > 0) {
      supabase.storage
        .from(CERTIFICATIONS_BUCKET)
        .remove(activity.photoStoragePaths)
        .then(({ error: storageError }) => {
          if (storageError) {
            console.error("[activity] certification photo cleanup failed:", storageError.message);
          }
        });
    }

    router.refresh();
  }

  return (
    <>
      <ul className="mt-3 flex flex-col gap-2">
        {activities.map((activity) => (
          <li key={activity.id}>
            <button
              type="button"
              onClick={() => activity.photoUrls.length > 0 && setOpenActivityId(activity.id)}
              disabled={activity.photoUrls.length === 0}
              className="flex w-full flex-col gap-1 rounded-2xl border border-border bg-surface px-4 py-3 text-left text-base disabled:opacity-100"
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
            </button>
          </li>
        ))}
      </ul>

      {openActivity && (
        <PhotoViewerModal
          photos={openActivity.photoUrls}
          caption={`${formatKoreanDate(openActivity.activity_date)} · ${Number(openActivity.distance_km).toFixed(2)}km`}
          canDelete={canDelete}
          onClose={() => setOpenActivityId(null)}
          onDelete={() => deleteActivity(openActivity)}
        />
      )}
    </>
  );
}
