"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { seasonWeekRange, SEASON_WEEKS } from "@/lib/season";
import { formatKoreanDate } from "@/lib/format";
import { getSignedPhotoUrls } from "@/lib/photos";
import type { WeekStat } from "@/lib/seasonStats";

type Member = { id: string; name: string; weeks: WeekStat[] };
type SortKey = "name" | "total";
type ModalActivity = {
  id: string;
  ordinal: number;
  activityDate: string;
  distanceKm: number;
  photoUrls: string[];
};

function totalSuccess(member: Member) {
  return member.weeks.filter((w) => w.isSuccess).length;
}

function cellClassName(week: WeekStat, isCurrentWeek: boolean) {
  const base =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold border border-zinc-200";
  const ring = isCurrentWeek ? " ring-2 ring-orange-400 border-0" : "";
  if (week.isSuccess)
    return `${base} text-bold text-base! bg-white text-green-500 border-green-500${ring}`;
  if (week.achieved > 0)
    return `${base} bg-zinc-100 text-zinc-700 dark:bg-zinc-600 dark:text-zinc-100${ring}`;
  return `${base} bg-zinc-100 text-zinc-300 dark:bg-zinc-800 dark:text-zinc-600${ring}`;
}

export function StatusBoard({
  members,
  currentWeekIndex,
  currentUserId,
  seasonId,
  seasonStartDate,
}: {
  members: Member[];
  currentWeekIndex: number;
  currentUserId: string;
  seasonId: string;
  seasonStartDate: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [modal, setModal] = useState<{
    name: string;
    weekIndex: number;
    activities: ModalActivity[];
  } | null>(null);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);

  const sortedMembers = [...members].sort((a, b) => {
    if (sortKey === "total") return totalSuccess(b) - totalSuccess(a);
    return a.name.localeCompare(b.name);
  });

  async function openCell(member: Member, weekIndex: number) {
    if (member.weeks[weekIndex].achieved === 0) return;

    setIsLoadingPhotos(true);
    setModal({ name: member.name, weekIndex, activities: [] });

    const supabase = createClient();
    const { start, end } = seasonWeekRange(seasonStartDate, weekIndex);

    const { data: activities } = await supabase
      .from("activities")
      .select("id, activity_date, distance_km, activity_photos(storage_path, sort_order)")
      .eq("user_id", member.id)
      .eq("season_id", seasonId)
      .eq("status", "approved")
      .gte("activity_date", start)
      .lte("activity_date", end)
      .order("activity_date", { ascending: true })
      .returns<
        {
          id: string;
          activity_date: string;
          distance_km: number;
          activity_photos: { storage_path: string; sort_order: number }[];
        }[]
      >();

    const modalActivities = await Promise.all(
      (activities ?? []).map(async (activity, index) => ({
        id: activity.id,
        ordinal: index + 1,
        activityDate: activity.activity_date,
        distanceKm: Number(activity.distance_km),
        photoUrls: await getSignedPhotoUrls(supabase, activity.activity_photos),
      })),
    );

    setModal({ name: member.name, weekIndex, activities: modalActivities });
    setIsLoadingPhotos(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end gap-2 text-xs">
        <button
          type="button"
          onClick={() => setSortKey("name")}
          className={
            sortKey === "name" ? "font-bold text-orange-500" : "text-zinc-400"
          }
        >
          이름순
        </button>
        <button
          type="button"
          onClick={() => setSortKey("total")}
          className={
            sortKey === "total" ? "font-bold text-orange-500" : "text-zinc-400"
          }
        >
          성공횟수순
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-zinc-900">
        <table className="w-full min-w-90 border-collapse text-sm">
          <thead>
            <tr className="text-xs text-zinc-400">
              <th className="px-3 py-2 text-left font-medium">이름</th>
              {Array.from({ length: SEASON_WEEKS }, (_, i) => (
                <th
                  key={i}
                  className={
                    i === currentWeekIndex
                      ? "px-1 py-2 font-bold text-orange-500"
                      : "px-1 py-2 font-medium"
                  }
                >
                  {i + 1}주
                </th>
              ))}
              <th className="px-3 py-2 font-medium">성공횟수</th>
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map((member) => (
              <tr
                key={member.id}
                className={
                  member.id === currentUserId
                    ? "bg-orange-50 dark:bg-orange-950/40"
                    : "border-t border-zinc-100 dark:border-zinc-800"
                }
              >
                <td className="whitespace-nowrap px-3 py-2 font-semibold text-zinc-900 dark:text-zinc-50">
                  {member.name}
                </td>
                {member.weeks.map((week, weekIndex) => (
                  <td key={weekIndex} className="px-1 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => openCell(member, weekIndex)}
                      disabled={week.achieved === 0}
                      className={cellClassName(
                        week,
                        weekIndex === currentWeekIndex,
                      )}
                      title={`${weekIndex + 1}주차 ${week.achieved}회`}
                    >
                      {week.achieved > 0 ? week.achieved : ""}
                    </button>
                  </td>
                ))}
                <td className="px-3 py-2 text-center font-bold text-zinc-900 dark:text-zinc-50">
                  {totalSuccess(member)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-4 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {modal.name} · {modal.weekIndex + 1}주차
            </p>
            {isLoadingPhotos ? (
              <p className="mt-4 py-8 text-center text-sm text-zinc-400">
                불러오는 중...
              </p>
            ) : modal.activities.length === 0 ? (
              <p className="mt-4 py-8 text-center text-sm text-zinc-400">
                사진이 없어요.
              </p>
            ) : (
              <div className="mt-3 flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
                {modal.activities.map((activity) => (
                  <div key={activity.id} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-orange-500">
                        {activity.ordinal}회째 · {formatKoreanDate(activity.activityDate)}
                      </span>
                      <span className="text-zinc-400">{activity.distanceKm.toFixed(1)}km</span>
                    </div>
                    <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto">
                      {activity.photoUrls.map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={url}
                          src={url}
                          alt="인증샷"
                          className="aspect-square w-full shrink-0 snap-center rounded-xl object-cover"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setModal(null)}
              className="mt-4 w-full rounded-xl bg-zinc-200 py-2.5 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
