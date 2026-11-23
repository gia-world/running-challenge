"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CERTIFICATIONS_BUCKET } from "@/lib/photos";
import { FeedPhotoThumbnail } from "@/components/FeedPhotoThumbnail";
import { PhotoViewerModal } from "@/components/PhotoViewerModal";
import { ReactionBar, type ReactionState } from "@/components/ReactionBar";
import { CommentSection } from "@/components/CommentSection";
import type { CommentItem } from "@/app/feed/loadFeed";

/**
 * One feed card — photo, byline, and the reaction/재인증요청/삭제 row.
 * Reactions and the 재인증요청 flag live here (not inside ReactionBar) so
 * the collapsed card and the enlarged PhotoViewerModal — which the user
 * asked to think of as "the same card, just bigger" — always agree: tap
 * the photo to view large and react from there, and it's still in sync
 * once you close back down to the card.
 */
export function FeedCard({
  activityId,
  currentUserId,
  isOwnActivity,
  isSeasonSettled,
  canDelete,
  photoUrls,
  thumbnailUrls,
  photoStoragePaths,
  initialReactions,
  initialRequested,
  comments,
  autoOpen,
  infoRow,
  caption,
  note,
}: {
  activityId: string;
  currentUserId: string;
  isOwnActivity: boolean;
  isSeasonSettled: boolean;
  canDelete: boolean;
  photoUrls: string[];
  /** 그리드 썸네일 전용 작은 이미지 — 모달(원본 photoUrls)과 별개. */
  thumbnailUrls: string[];
  photoStoragePaths: string[];
  initialReactions: { emoji: string; count: number; reactedByMe: boolean }[];
  initialRequested: boolean;
  comments: CommentItem[];
  /** 알림의 "그 피드로 가기" 링크로 들어왔을 때 이 카드를 바로 확대해서
   * 보여준다. */
  autoOpen?: boolean;
  infoRow: ReactNode;
  caption: ReactNode;
  note?: string | null;
}) {
  const router = useRouter();
  const [isViewerOpen, setIsViewerOpen] = useState(autoOpen ?? false);
  const [prevAutoOpen, setPrevAutoOpen] = useState(autoOpen ?? false);
  // /feed에 이미 떠 있는 상태에서 알림 링크를 눌러 같은 경로로 검색
  // 파라미터만 바뀌는 경우(소프트 내비게이션)엔 이 카드가 리마운트되지
  // 않아서 useState 초기값만으론 못 잡는다 — 새로고침해야만 열리던
  // 버그가 이것 때문이었다. FeedList의 initialItems 동기화와 같은
  // 패턴(useEffect 대신 렌더 중에 비교)으로, autoOpen이 false→true로
  // 바뀌는 순간만 잡아서 그때 한 번 더 연다.
  if ((autoOpen ?? false) !== prevAutoOpen) {
    setPrevAutoOpen(autoOpen ?? false);
    if (autoOpen) setIsViewerOpen(true);
  }
  const [reactions, setReactions] = useState<Record<string, ReactionState>>(() =>
    Object.fromEntries(
      initialReactions.map((r) => [r.emoji, { count: r.count, reactedByMe: r.reactedByMe }]),
    ),
  );
  const [requested, setRequested] = useState(initialRequested);

  async function deleteActivity() {
    const supabase = createClient();
    const { error } = await supabase.from("activities").delete().eq("id", activityId);
    if (error) {
      console.error("[feed] activity delete failed:", error.message);
      throw error;
    }

    // Best-effort — the activity row is already gone (the part everyone
    // else sees), so a leftover storage file just wastes space rather
    // than leaving anything inconsistent for the user.
    if (photoStoragePaths.length > 0) {
      supabase.storage
        .from(CERTIFICATIONS_BUCKET)
        .remove(photoStoragePaths)
        .then(({ error: storageError }) => {
          if (storageError) {
            console.error("[feed] certification photo cleanup failed:", storageError.message);
          }
        });
    }

    router.refresh();
  }

  const reactionBarProps = {
    activityId,
    currentUserId,
    isOwnActivity,
    isSeasonSettled,
    reactions,
    onReactionsChange: setReactions,
    requested,
    onRequestedChange: setRequested,
    canDelete,
    onDelete: deleteActivity,
  };

  const noteBlock = note && (
    <p className="whitespace-pre-wrap px-4 pb-2 text-sm text-ink-secondary">{note}</p>
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface">
      <FeedPhotoThumbnail
        photoUrls={thumbnailUrls}
        alt="인증샷"
        onOpen={() => setIsViewerOpen(true)}
      />
      {infoRow}
      {noteBlock}
      {!isViewerOpen && (
        <>
          <ReactionBar {...reactionBarProps} />
          <CommentSection
            activityId={activityId}
            currentUserId={currentUserId}
            comments={comments}
          />
        </>
      )}

      {isViewerOpen && (
        // canDelete is false here on purpose — the feed's ReactionBar (in
        // footer below) already offers 삭제/재인증요청 in the same slot, so
        // the modal's own built-in delete section would just duplicate it.
        <PhotoViewerModal
          photos={photoUrls}
          caption={caption}
          canDelete={false}
          onClose={() => setIsViewerOpen(false)}
          onDelete={deleteActivity}
          footer={
            <>
              {noteBlock}
              <ReactionBar {...reactionBarProps} />
              <CommentSection
                activityId={activityId}
                currentUserId={currentUserId}
                comments={comments}
              />
            </>
          }
        />
      )}
    </article>
  );
}
