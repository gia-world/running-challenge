"use client";

import { useState, useTransition } from "react";
import { FeedCard } from "@/components/FeedCard";
import { Button } from "@/components/Button";
import { formatKoreanDate } from "@/lib/format";
import type { FeedItem } from "@/app/feed/loadFeed";
import { loadMoreFeed } from "@/app/feed/actions";

/**
 * 피드 목록 + "더보기" — 서버에서 받은 첫 페이지를 들고 있다가, 누르면
 * 서버 액션으로 다음 페이지를 이어붙인다. caption/infoRow는 서버 액션이
 * JSX를 돌려줄 수 없어서(직렬화 가능한 값만 가능) 여기서 조립한다.
 */
export function FeedList({
  initialItems,
  initialNextCursor,
  currentUserId,
}: {
  initialItems: FeedItem[];
  initialNextCursor: string | null;
  currentUserId: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isPending, startTransition] = useTransition();

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
                  {formatKoreanDate(item.activityDate)} · {item.distanceKm.toFixed(2)}km
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
