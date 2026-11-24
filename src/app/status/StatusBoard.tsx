"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { seasonWeekRange } from "@/lib/season";
import { formatKoreanDate } from "@/lib/format";
import { getSignedPhotoUrls } from "@/lib/photos";
import { earnedBadges, BADGE_CATALOG } from "@/lib/badges";
import { EmptyState } from "@/components/EmptyState";
import { BottomSheet } from "@/components/BottomSheet";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { SectionTitle } from "@/components/SectionTitle";
import { SeasonGate } from "@/components/SeasonGate";
import { Button } from "@/components/Button";
import type { WeekStat } from "@/lib/seasonStats";
import type { SeasonHistoryEntry } from "@/lib/seasonHistory";

type Member = { id: string; name: string; weeks: WeekStat[]; totalDistanceKm: number };
type BadgeMember = {
  id: string;
  name: string;
  completedCount: number;
  hasParticipated: boolean;
};
type SortKey = "name" | "total" | "distance";
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
  if (week.achieved > 0) return `${base} bg-muted text-ink${ring}`;
  return `${base} bg-muted text-ink-disabled${ring}`;
}

export function StatusBoard({
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
  teamSettlementBankName,
  teamSettlementAccountNumber,
}: {
  isSeasonMember: boolean;
  activeSeasonRange: { start_date: string; end_date: string } | null;
  members: Member[];
  currentWeekIndex: number;
  weekCount: number;
  currentUserId: string;
  seasonId: string;
  seasonStartDate: string;
  history: SeasonHistoryEntry[];
  badgeMembers: BadgeMember[];
  teamSettlementBankName: string | null;
  teamSettlementAccountNumber: string | null;
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

  // "총 거리"/"성공횟수" 칸을 추가하면서 테이블에 w-full을 썼던 탓에
  // 주차 칸들이 찌그러지던 버그 + "주차별 칸이 스크롤된다는 걸 못
  // 알아챌 수 있다"는 피드백을 같이 해결한다. 처음엔 이름/성공횟수/
  // 총거리를 table 안에서 position:sticky로 고정해봤는데, 스크롤을
  // 끝까지 밀면 고정된 칸 밑에 깔려야 할 주차 칸이 가장자리에서 살짝
  // 비쳐 보이는 버그가 있었다(테이블 안 sticky는 브라우저마다 알려진
  // 렌더링 함정이 있다) — 그래서 테이블 하나가 아니라 **이름(안 움직임)
  // / 주차 칸들(이 안에서만 가로 스크롤) / 성공횟수·총거리(안 움직임)**
  // 세 개의 독립된 flex 영역으로 나눴다. sticky를 전혀 안 쓰니 그 문제
  // 자체가 생길 수 없다.
  //
  // 스크롤 가능 표시는 처음에 흐림 효과(fade)로 해봤는데, 이 앱은
  // 다크모드 없이 캔버스/카드가 전부 흰색이라(맨 위 DESIGN.md 원칙)
  // 흰 배경 위에 흰색으로 흐려지는 효과가 사실상 안 보여서 — 대신 고정
  // 영역과의 경계에 실선 구분선을 둬서 "여기부터는 고정, 그 안쪽은
  // 스크롤"을 항상 보이게 표시한다(헤어라인 보더로 구조를 드러내는 이
  // 앱의 기존 톤과도 더 맞는다).
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentWeekCellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 현재 주차가 스크롤 영역 가운데 오도록 — 매번 맨 왼쪽부터 찾아야
    // 하면 번거로우니까. offsetLeft는 가장 가까운 position:relative류
    // 조상 기준이라(이 트리엔 그런 조상이 없어서) 카드 전체 기준의
    // 엉뚱한 값이 나온다 — 대신 getBoundingClientRect로 뷰포트 기준
    // 좌표를 구하고 현재 scrollLeft를 더해서 "스크롤 콘텐츠 안에서의
    // 위치"를 역산한다.
    const el = scrollRef.current;
    const cell = currentWeekCellRef.current;
    if (el && cell) {
      const elRect = el.getBoundingClientRect();
      const cellRect = cell.getBoundingClientRect();
      const cellLeftInContent = cellRect.left - elRect.left + el.scrollLeft;
      const cellCenter = cellLeftInContent + cellRect.width / 2;
      el.scrollLeft = Math.max(0, cellCenter - el.clientWidth / 2);
    }
  }, []);

  const sortedMembers = [...members].sort((a, b) => {
    if (sortKey === "total") return totalSuccess(b) - totalSuccess(a);
    if (sortKey === "distance") return b.totalDistanceKm - a.totalDistanceKm;
    return a.name.localeCompare(b.name);
  });

  const sortedBadgeMembers = badgeMembers
    .map((member) => ({
      ...member,
      badges: earnedBadges(member.completedCount, member.hasParticipated),
    }))
    .sort((a, b) => {
      if (badgeSortKey === "count")
        return b.badges.length - a.badges.length || a.name.localeCompare(b.name);
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
    <div className="flex flex-col gap-4">
      <SegmentedTabs
        items={[
          {
            key: "season",
            label: "이번 시즌",
            isActive: view === "season",
            onClick: () => setView("season"),
          },
          {
            key: "history",
            label: "전체 기록",
            isActive: view === "history",
            onClick: () => setView("history"),
          },
        ]}
      >
        {view === "season" ? (
          <SeasonGate
            viewer={{
              activeSeason: activeSeasonRange,
              isSeasonMember,
              teamSettlementBankName,
              teamSettlementAccountNumber,
            }}
          >
            <div className="flex flex-col gap-3">
              <div className="flex justify-end gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setSortKey("name")}
                  className={sortKey === "name" ? "font-bold text-primary" : "text-ink-tertiary"}
                >
                  이름순
                </button>
                <button
                  type="button"
                  onClick={() => setSortKey("total")}
                  className={sortKey === "total" ? "font-bold text-primary" : "text-ink-tertiary"}
                >
                  성공횟수순
                </button>
                <button
                  type="button"
                  onClick={() => setSortKey("distance")}
                  className={
                    sortKey === "distance" ? "font-bold text-primary" : "text-ink-tertiary"
                  }
                >
                  거리순
                </button>
              </div>

              <div className="flex overflow-hidden rounded-2xl border border-border bg-surface text-sm">
                {/* 왼쪽: 이름 — 스크롤과 무관하게 항상 보임 */}
                <div className="flex shrink-0 flex-col border-r border-border-subtle">
                  <div className="flex h-9 items-center px-3 py-2 font-medium text-ink-tertiary">
                    이름
                  </div>
                  {sortedMembers.map((member) => (
                    <div
                      key={member.id}
                      className={`flex h-[52px] items-center whitespace-nowrap px-3 py-2 font-semibold text-ink-strong ${
                        member.id === currentUserId
                          ? "bg-primary-50"
                          : "border-t border-border-subtle"
                      }`}
                    >
                      {member.name}
                    </div>
                  ))}
                </div>

                {/* 가운데: 주차별 칸 — 이 영역만 가로 스크롤된다 */}
                <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto">
                  <div className="flex h-9 items-center text-ink-tertiary">
                    {Array.from({ length: weekCount }, (_, i) => (
                      <div
                        key={i}
                        ref={i === currentWeekIndex ? currentWeekCellRef : undefined}
                        className={`flex w-10 shrink-0 items-center justify-center py-2 ${
                          i === currentWeekIndex ? "font-bold text-primary" : "font-medium"
                        }`}
                      >
                        {i + 1}주
                      </div>
                    ))}
                  </div>
                  {sortedMembers.map((member) => (
                    <div
                      key={member.id}
                      className={`flex h-[52px] items-center ${
                        member.id === currentUserId
                          ? "bg-primary-50"
                          : "border-t border-border-subtle"
                      }`}
                    >
                      {member.weeks.map((week, weekIndex) => (
                        <div
                          key={weekIndex}
                          className="flex w-10 shrink-0 items-center justify-center py-2"
                        >
                          <button
                            type="button"
                            onClick={() => openCell(member, weekIndex)}
                            disabled={week.achieved === 0}
                            className={cellClassName(week, weekIndex === currentWeekIndex)}
                            title={`${weekIndex + 1}주차 ${week.achieved}회`}
                          >
                            {week.achieved > 0 ? week.achieved : ""}
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* 오른쪽: 성공횟수/총거리 — 역시 항상 보임 */}
                <div className="flex shrink-0 border-l border-border-subtle">
                  <div className="flex shrink-0 flex-col">
                    <div className="flex h-9 w-20 items-center justify-center px-2 py-2 font-medium text-ink-tertiary">
                      성공횟수
                    </div>
                    {sortedMembers.map((member) => (
                      <div
                        key={member.id}
                        className={`flex h-[52px] w-20 items-center justify-center px-2 py-2 font-bold text-ink-strong ${
                          member.id === currentUserId
                            ? "bg-primary-50"
                            : "border-t border-border-subtle"
                        }`}
                      >
                        {totalSuccess(member)}
                      </div>
                    ))}
                  </div>
                  <div className="flex shrink-0 flex-col border-l border-border-subtle">
                    <div className="flex h-9 w-24 items-center justify-center px-3 py-2 font-medium text-ink-tertiary">
                      총 거리
                    </div>
                    {sortedMembers.map((member) => (
                      <div
                        key={member.id}
                        className={`flex h-[52px] w-24 items-center justify-center whitespace-nowrap px-3 py-2 text-ink-secondary ${
                          member.id === currentUserId
                            ? "bg-primary-50"
                            : "border-t border-border-subtle"
                        }`}
                      >
                        {member.totalDistanceKm.toFixed(2)}km
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </SeasonGate>
        ) : (
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <SectionTitle>시즌 성공 뱃지</SectionTitle>
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
                      <span className="font-semibold text-ink-strong">{member.name}</span>
                      {badges.length > 0 ? (
                        <span className="flex flex-wrap items-center justify-end gap-1 text-xl">
                          {badges.map((badge, index) => (
                            <span key={`${badge.emoji}-${index}`} title={badge.label}>
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
              <SectionTitle>시즌 이력</SectionTitle>
              {history.length === 0 ? (
                <EmptyState>아직 끝난 시즌이 없어요.</EmptyState>
              ) : (
                <ul className="flex flex-col gap-2">
                  {history.map((season) => {
                    const rowContent = (
                      <>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-ink-strong">
                            {formatKoreanDate(season.start_date)} ~{" "}
                            {formatKoreanDate(season.end_date)}
                          </span>
                          <span className="text-sm text-ink-tertiary">
                            참가 {season.participantCount}명 · 완주 {season.completedCount}명
                          </span>
                        </div>
                        <span className="shrink-0 text-sm font-medium">
                          {!season.viewerParticipated ? (
                            <span className="text-ink-disabled">미참여</span>
                          ) : season.viewerCompleted ? (
                            <span className="text-success">완주</span>
                          ) : (
                            <span className="text-ink-tertiary">참여</span>
                          )}
                        </span>
                      </>
                    );
                    // 참여한 시즌만 개인 리포트(성공 여부·정산 결과)로 들어갈 수
                    // 있음 — 참여 안 한 시즌은 눌러봐야 보여줄 게 없다.
                    return (
                      <li key={season.id}>
                        {season.viewerParticipated ? (
                          <Link
                            href={`/season/${season.id}`}
                            className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3"
                          >
                            {rowContent}
                          </Link>
                        ) : (
                          <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
                            {rowContent}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </SegmentedTabs>

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
              <p className="mt-4 py-8 text-center text-base text-ink-tertiary">불러오는 중...</p>
            ) : modal.activities.length === 0 ? (
              <p className="mt-4 py-8 text-center text-base text-ink-tertiary">사진이 없어요.</p>
            ) : (
              <div className="mt-3 flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
                {modal.activities.map((activity) => (
                  <div key={activity.id} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-primary">
                        {activity.ordinal}회째 · {formatKoreanDate(activity.activityDate)}
                      </span>
                      <span className="text-ink-tertiary">{activity.distanceKm.toFixed(2)}km</span>
                    </div>
                    <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto">
                      {activity.photoUrls.map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={url}
                          src={url}
                          alt="인증샷"
                          loading="lazy"
                          className="aspect-square w-full shrink-0 snap-center rounded-xl object-cover"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button variant="secondary" className="mt-4" onClick={() => setModal(null)}>
              닫기
            </Button>
          </div>
        </div>
      )}

      {showBadgeInfo && (
        <BottomSheet onClose={() => setShowBadgeInfo(false)}>
          <div className="flex flex-col gap-3">
            <SectionTitle size="lg">뱃지 기준</SectionTitle>
            <ul className="flex flex-col gap-3">
              {BADGE_CATALOG.map((badge) => (
                <li key={badge.emoji} className="flex items-center gap-3">
                  <span className="text-2xl">{badge.emoji}</span>
                  <div className="flex flex-col">
                    <span className="font-semibold text-ink-strong">{badge.label}</span>
                    <span className="text-sm text-ink-secondary">{badge.criteria}</span>
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
