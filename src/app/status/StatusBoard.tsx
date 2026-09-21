"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { seasonWeekRange } from "@/lib/season";
import { formatKoreanDate } from "@/lib/format";
import { getSignedPhotoUrls } from "@/lib/photos";
import { earnedBadges, BADGE_CATALOG } from "@/lib/badges";
import { EmptyState } from "@/components/EmptyState";
import { BottomSheet } from "@/components/BottomSheet";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import type { WeekStat } from "@/lib/seasonStats";
import type { SeasonHistoryEntry } from "@/lib/seasonHistory";

type Member = { id: string; name: string; weeks: WeekStat[] };
type BadgeMember = {
  id: string;
  name: string;
  completedCount: number;
  hasParticipated: boolean;
};
type SortKey = "name" | "total";
type BadgeSortKey = "name" | "count";
type View = "season" | "history";
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
    "inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold border border-border";
  const ring = isCurrentWeek ? " ring-2 ring-primary-400 border-0" : "";
  if (week.isSuccess)
    return `${base} text-bold text-base! bg-surface text-success border-success${ring}`;
  if (week.achieved > 0)
    return `${base} bg-muted text-ink${ring}`;
  return `${base} bg-muted text-ink-disabled${ring}`;
}

export function StatusBoard({
  hasActiveSeason,
  isSeasonMember,
  activeSeasonRange,
  members,
  currentWeekIndex,
  weekCount,
  currentUserId,
  seasonId,
  seasonStartDate,
  history,
  badgeMembers,
}: {
  hasActiveSeason: boolean;
  isSeasonMember: boolean;
  activeSeasonRange: { start: string; end: string } | null;
  members: Member[];
  currentWeekIndex: number;
  weekCount: number;
  currentUserId: string;
  seasonId: string;
  seasonStartDate: string;
  history: SeasonHistoryEntry[];
  badgeMembers: BadgeMember[];
}) {
  const [view, setView] = useState<View>("season");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [badgeSortKey, setBadgeSortKey] = useState<BadgeSortKey>("count");
  const [modal, setModal] = useState<{
    name: string;
    weekIndex: number;
    activities: ModalActivity[];
  } | null>(null);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [showBadgeInfo, setShowBadgeInfo] = useState(false);

  const sortedMembers = [...members].sort((a, b) => {
    if (sortKey === "total") return totalSuccess(b) - totalSuccess(a);
    return a.name.localeCompare(b.name);
  });

  const sortedBadgeMembers = badgeMembers
    .map((member) => ({
      ...member,
      badges: earnedBadges(member.completedCount, member.hasParticipated),
    }))
    .sort((a, b) => {
      if (badgeSortKey === "count") return b.badges.length - a.badges.length || a.name.localeCompare(b.name);
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
      .select(
        "id, activity_date, distance_km, activity_photos(storage_path, sort_order)",
      )
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
    <div className="flex flex-col gap-4">
      <SegmentedTabs
        items={[
          { key: "season", label: "이번 시즌", isActive: view === "season", onClick: () => setView("season") },
          { key: "history", label: "전체 기록", isActive: view === "history", onClick: () => setView("history") },
        ]}
      />

      {view === "season" ? (
        !hasActiveSeason ? (
          <EmptyState>
            지금 진행 중인 시즌이 없어요.
            <br />
            관리자가 시즌을 만들면 시작할 수 있어요.
          </EmptyState>
        ) : !isSeasonMember ? (
          <EmptyState>
            {activeSeasonRange && (
              <p className="text-sm text-ink-tertiary">
                {formatKoreanDate(activeSeasonRange.start)} ~{" "}
                {formatKoreanDate(activeSeasonRange.end)}
              </p>
            )}
            <p className="mt-2">
              이번 시즌에는 참여 중이 아니에요.
              <br />
              관리자에게 참여를 요청해주세요.
            </p>
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex justify-end gap-2 text-sm">
              <button
                type="button"
                onClick={() => setSortKey("name")}
                className={
                  sortKey === "name"
                    ? "font-bold text-primary"
                    : "text-ink-tertiary"
                }
              >
                이름순
              </button>
              <button
                type="button"
                onClick={() => setSortKey("total")}
                className={
                  sortKey === "total"
                    ? "font-bold text-primary"
                    : "text-ink-tertiary"
                }
              >
                성공횟수순
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
              <table className="w-full min-w-90 border-collapse text-sm">
                <thead>
                  <tr className="text-sm text-ink-tertiary">
                    <th className="px-3 py-2 text-left font-medium">이름</th>
                    {Array.from({ length: weekCount }, (_, i) => (
                      <th
                        key={i}
                        className={
                          i === currentWeekIndex
                            ? "px-1 py-2 font-bold text-primary"
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
                          ? "bg-primary-50"
                          : "border-t border-border-subtle"
                      }
                    >
                      <td className="whitespace-nowrap px-3 py-2 font-semibold text-ink-strong">
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
                      <td className="px-3 py-2 text-center font-bold text-ink-strong">
                        {totalSuccess(member)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-semibold text-ink">
                  시즌 성공 뱃지
                </h2>
                <button
                  type="button"
                  onClick={() => setShowBadgeInfo(true)}
                  aria-label="뱃지 기준 보기"
                  className="flex h-4 w-4 items-center justify-center rounded-full border text-sm border-ink-secondary text-ink-secondary"
                >
                  ?
                </button>
              </div>
              <div className="flex gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setBadgeSortKey("name")}
                  className={
                    badgeSortKey === "name" ? "font-bold text-primary" : "text-ink-tertiary"
                  }
                >
                  이름순
                </button>
                <button
                  type="button"
                  onClick={() => setBadgeSortKey("count")}
                  className={
                    badgeSortKey === "count" ? "font-bold text-primary" : "text-ink-tertiary"
                  }
                >
                  뱃지 많은 순
                </button>
              </div>
            </div>
            <ul className="flex flex-col gap-2">
              {sortedBadgeMembers.map((member) => {
                const { badges } = member;
                return (
                  <li
                    key={member.id}
                    className={
                      member.id === currentUserId
                        ? "flex items-center justify-between rounded-2xl border border-primary-400 bg-primary-50 px-4 py-3"
                        : "flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3"
                    }
                  >
                    <span className="font-semibold text-ink-strong">
                      {member.name}
                    </span>
                    {badges.length > 0 ? (
                      <span className="flex flex-wrap items-center justify-end gap-1 text-xl">
                        {badges.map((badge, index) => (
                          <span
                            key={`${badge.emoji}-${index}`}
                            title={badge.label}
                          >
                            {badge.emoji}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-sm text-ink-tertiary">아직 없음</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-base font-semibold text-ink">
              시즌 이력
            </h2>
            {history.length === 0 ? (
              <EmptyState>아직 끝난 시즌이 없어요.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-2">
                {history.map((season) => (
                  <li
                    key={season.id}
                    className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-ink-strong">
                        {formatKoreanDate(season.start_date)} ~{" "}
                        {formatKoreanDate(season.end_date)}
                      </span>
                      <span className="text-sm text-ink-tertiary">
                        참가 {season.participantCount}명 · 완주{" "}
                        {season.completedCount}명
                      </span>
                    </div>
                    <span className="shrink-0 text-sm font-medium">
                      {!season.viewerParticipated ? (
                        <span className="text-ink-disabled">
                          미참여
                        </span>
                      ) : season.viewerCompleted ? (
                        <span className="text-success">완주</span>
                      ) : (
                        <span className="text-ink-tertiary">참여</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-surface p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-semibold text-ink-strong">
              {modal.name} · {modal.weekIndex + 1}주차
            </p>
            {isLoadingPhotos ? (
              <p className="mt-4 py-8 text-center text-base text-ink-tertiary">
                불러오는 중...
              </p>
            ) : modal.activities.length === 0 ? (
              <p className="mt-4 py-8 text-center text-base text-ink-tertiary">
                사진이 없어요.
              </p>
            ) : (
              <div className="mt-3 flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
                {modal.activities.map((activity) => (
                  <div key={activity.id} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-primary">
                        {activity.ordinal}회째 ·{" "}
                        {formatKoreanDate(activity.activityDate)}
                      </span>
                      <span className="text-ink-tertiary">
                        {activity.distanceKm.toFixed(1)}km
                      </span>
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
              className="mt-4 w-full rounded-xl bg-muted-strong py-2.5 text-base font-medium text-ink"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {showBadgeInfo && (
        <BottomSheet onClose={() => setShowBadgeInfo(false)}>
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-ink-strong">
              뱃지 기준
            </h2>
            <ul className="flex flex-col gap-3">
              {BADGE_CATALOG.map((badge) => (
                <li key={badge.emoji} className="flex items-center gap-3">
                  <span className="text-2xl">{badge.emoji}</span>
                  <div className="flex flex-col">
                    <span className="font-semibold text-ink-strong">
                      {badge.label}
                    </span>
                    <span className="text-sm text-ink-secondary">
                      {badge.criteria}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
