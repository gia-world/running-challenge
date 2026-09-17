"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const UNIQUE_VIOLATION = "23505";

export function FeedCardActions({
  activityId,
  currentUserId,
  isOwnActivity,
  initialLiked,
  initialLikeCount,
  initialRequested,
}: {
  activityId: string;
  currentUserId: string;
  isOwnActivity: boolean;
  initialLiked: boolean;
  initialLikeCount: number;
  initialRequested: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLiking, setIsLiking] = useState(false);

  const [requested, setRequested] = useState(initialRequested);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  async function toggleLike() {
    if (isLiking) return;
    setIsLiking(true);

    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((count) => count + (nextLiked ? 1 : -1));

    try {
      const supabase = createClient();
      if (nextLiked) {
        const { error } = await supabase
          .from("activity_likes")
          .insert({ activity_id: activityId, user_id: currentUserId });
        if (error && error.code !== UNIQUE_VIOLATION) throw error;
      } else {
        const { error } = await supabase
          .from("activity_likes")
          .delete()
          .eq("activity_id", activityId)
          .eq("user_id", currentUserId);
        if (error) throw error;
      }
    } catch (err) {
      console.error("[feed] like toggle failed:", err);
      setLiked(!nextLiked);
      setLikeCount((count) => count + (nextLiked ? -1 : 1));
    } finally {
      setIsLiking(false);
    }
  }

  async function toggleRequest() {
    if (isRequesting) return;
    setIsRequesting(true);
    setRequestError(null);

    try {
      const supabase = createClient();
      if (requested) {
        const { error } = await supabase
          .from("activity_review_requests")
          .delete()
          .eq("activity_id", activityId)
          .eq("requested_by", currentUserId)
          .eq("status", "pending");
        if (error) throw error;
        setRequested(false);
      } else {
        const { error } = await supabase
          .from("activity_review_requests")
          .insert({ activity_id: activityId, requested_by: currentUserId });
        if (error && error.code !== UNIQUE_VIOLATION) throw error;
        setRequested(true);
      }
    } catch (err) {
      console.error("[feed] review request toggle failed:", err);
      setRequestError("처리에 실패했어요. 다시 시도해주세요.");
    } finally {
      setIsRequesting(false);
    }
  }

  return (
    <div className="flex items-center gap-3 border-t border-zinc-100 px-4 py-2 text-xs dark:border-zinc-800">
      <button
        type="button"
        onClick={toggleLike}
        disabled={isLiking}
        className={
          liked
            ? "flex items-center gap-1 font-semibold text-orange-500"
            : "flex items-center gap-1 text-zinc-400 dark:text-zinc-500"
        }
      >
        <span>{liked ? "❤️" : "🤍"}</span>
        {likeCount > 0 ? likeCount : "좋아요"}
      </button>

      {!isOwnActivity && (
        <button
          type="button"
          onClick={toggleRequest}
          disabled={isRequesting}
          className={
            requested
              ? "font-semibold text-red-500"
              : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
          }
        >
          {requested ? "재인증 요청 취소" : "재인증 요청"}
        </button>
      )}

      {requestError && <span className="text-red-500">{requestError}</span>}
    </div>
  );
}
