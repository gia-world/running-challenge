"use client";

import { useState, useTransition } from "react";
import { FeedCard } from "@/components/FeedCard";
import { Button } from "@/components/Button";
import { formatDistanceKm, formatKoreanDate } from "@/lib/format";
import type { FeedItem } from "@/app/feed/loadFeed";
import { loadMoreFeed } from "@/app/feed/actions";

/**
 * 피드 목록 + "더보기" — 서버에서 받은 첫 페이지를 들고 있다가, 누르면
 * 서버 액션으로 다음 페이지를 이어붙인다. caption/infoRow는 서버 액션이
 * JSX를 돌려줄 수 없어서(직렬화 가능한 값만 가능) 여기서 조립한다.
 *
 * 댓글 작성/활동 삭제처럼 `router.refresh()`로 서버 데이터를 다시
 * 받아오는 액션들이 있는데, `useState(initialItems)`는 최초 마운트
 * 때만 값을 쓰고 그 뒤로는 props가 바뀌어도 무시한다 — refresh가 와도
 * 화면이 그대로였던 버그(댓글을 달아도 안 보이던 것)가 이것 때문이었다.
 * 그래서 `initialItems`가 바뀔 때마다 동기화한다 — 새로 받아온 첫
 * 페이지로 덮어쓰되, "더보기"로 그 뒤에 더 불러온 항목은 그대로 뒤에
 * 붙여서 유지한다(새로고침 한 번에 더보기 페이지가 날아가지 않게).
 * useEffect가 아니라 렌더 중에 바로 동기화한다 — "prop이 바뀌면 state를
 * 리셋한다"는 리액트 공식 문서가 권장하는 패턴(이펙트 안에서 setState를
 * 호출하면 불필요한 리렌더가 한 번 더 생긴다).
 */
export function FeedList({
  initialItems,
  initialNextCursor,
  currentUserId,
  autoOpenActivityId,
}: {
  initialItems: FeedItem[];
  initialNextCursor: string | null;
  currentUserId: string;
  /** 알림의 "그 피드로 가기" 링크로 들어왔을 때, 그 활동 카드를 열어둔
   * 채로 보여준다. */
  autoOpenActivityId?: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [prevInitialItems, setPrevInitialItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isPending, startTransition] = useTransition();

  if (initialItems !== prevInitialItems) {
    setPrevInitialItems(initialItems);
    const firstPageIds = new Set(initialItems.map((item) => item.id));
    const loadedMore = items.filter((item) => !firstPageIds.has(item.id));
    setItems([...initialItems, ...loadedMore]);
  }

  function handleLoadMore() {
    if (!nextCursor) return;
    startTransition(async () => {
      const { items: more, nextCursor: cursor } = await loadMoreFeed(nextCursor);
      setItems((prev) => [...prev, ...more]);
      setNextCursor(cursor);
    });
  }

  return (
    <>
      {items.map((item) => (
        <FeedCard
          key={item.id}
          activityId={item.id}
          currentUserId={currentUserId}
          isOwnActivity={item.isOwnActivity}
          isSeasonSettled={item.isSeasonSettled}
          canDelete={item.canDelete}
          photoUrls={item.photoUrls}
          thumbnailUrls={item.thumbnailUrls}
          photoStoragePaths={item.photoStoragePaths}
          initialReactions={item.reactions}
          initialRequested={item.requestedByMe}
          comments={item.comments}
          autoOpen={item.id === autoOpenActivityId}
          note={item.note}
          caption={
            <>
              {item.profileName ?? "러너"} · {formatKoreanDate(item.activityDate)}
              {item.occurrenceLabel && ` · ${item.occurrenceLabel}`}
            </>
          }
          infoRow={
            <div className="flex items-center justify-between px-4 py-3 text-base">
              <p>
                <span className="font-semibold text-ink-strong">{item.profileName ?? "러너"}</span>
                {" · "}
                {item.occurrenceLabel && (
                  <span className="text-sm font-medium text-primary">{item.occurrenceLabel}</span>
                )}
              </p>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-ink-secondary">
                  {formatKoreanDate(item.activityDate)} · {formatDistanceKm(item.distanceKm)}
                </span>
              </div>
            </div>
          }
        />
      ))}

      {nextCursor && (
        <Button variant="secondary" onClick={handleLoadMore} disabled={isPending}>
          {isPending ? "불러오는 중..." : "더보기"}
        </Button>
      )}
    </>
  );
}
