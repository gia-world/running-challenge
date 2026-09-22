"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CERTIFICATIONS_BUCKET } from "@/lib/photos";
import { FeedPhotoThumbnail } from "@/components/FeedPhotoThumbnail";
import { PhotoViewerModal } from "@/components/PhotoViewerModal";
import { ReactionBar, type ReactionState } from "@/components/ReactionBar";

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
  photoStoragePaths,
  initialReactions,
  initialRequested,
  infoRow,
  caption,
}: {
  activityId: string;
  currentUserId: string;
  isOwnActivity: boolean;
  isSeasonSettled: boolean;
  canDelete: boolean;
  photoUrls: string[];
  photoStoragePaths: string[];
  initialReactions: { emoji: string; count: number; reactedByMe: boolean }[];
  initialRequested: boolean;
  infoRow: ReactNode;
  caption: ReactNode;
}) {
  const router = useRouter();
  const [isViewerOpen, setIsViewerOpen] = useState(false);
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
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface">
      <FeedPhotoThumbnail photoUrls={photoUrls} alt="인증샷" onOpen={() => setIsViewerOpen(true)} />
      {infoRow}
      {!isViewerOpen && <ReactionBar {...reactionBarProps} />}

      {isViewerOpen && (
        <PhotoViewerModal
          photos={photoUrls}
          caption={caption}
          canDelete={canDelete}
          onClose={() => setIsViewerOpen(false)}
          onDelete={deleteActivity}
          footer={<ReactionBar {...reactionBarProps} dark />}
        />
      )}
    </article>
  );
}
