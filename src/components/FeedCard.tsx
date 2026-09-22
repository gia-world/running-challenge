"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { FeedPhotoThumbnail } from "@/components/FeedPhotoThumbnail";
import { ReactionBar, type ReactionState } from "@/components/ReactionBar";

/** One feed card — photo (tap opens the activity's detail page), byline, and the reaction/재인증요청 row. */
export function FeedCard({
  activityId,
  currentUserId,
  isOwnActivity,
  isSeasonSettled,
  photoUrls,
  initialReactions,
  initialRequested,
  infoRow,
}: {
  activityId: string;
  currentUserId: string;
  isOwnActivity: boolean;
  isSeasonSettled: boolean;
  photoUrls: string[];
  initialReactions: { emoji: string; count: number; reactedByMe: boolean }[];
  initialRequested: boolean;
  infoRow: ReactNode;
}) {
  const [reactions, setReactions] = useState<Record<string, ReactionState>>(() =>
    Object.fromEntries(
      initialReactions.map((r) => [r.emoji, { count: r.count, reactedByMe: r.reactedByMe }]),
    ),
  );
  const [requested, setRequested] = useState(initialRequested);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface">
      <Link href={`/activities/${activityId}`}>
        <FeedPhotoThumbnail photoUrls={photoUrls} alt="인증샷" />
      </Link>
      {infoRow}
      <ReactionBar
        activityId={activityId}
        currentUserId={currentUserId}
        isOwnActivity={isOwnActivity}
        isSeasonSettled={isSeasonSettled}
        reactions={reactions}
        onReactionsChange={setReactions}
        requested={requested}
        onRequestedChange={setRequested}
      />
    </article>
  );
}
