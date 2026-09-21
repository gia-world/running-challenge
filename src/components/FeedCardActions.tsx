"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const UNIQUE_VIOLATION = "23505";

const REACTION_EMOJIS = [
  "❤️",
  "👍",
  "🔥",
  "💪",
  "🎉",
  "👏",
  "🎶",
  "😢",
  "🤣",
  "🫢",
] as const;

type ReactionState = { count: number; reactedByMe: boolean };

export function FeedCardActions({
  activityId,
  currentUserId,
  isOwnActivity,
  isSeasonSettled,
  initialReactions,
  initialRequested,
}: {
  activityId: string;
  currentUserId: string;
  isOwnActivity: boolean;
  isSeasonSettled: boolean;
  initialReactions: { emoji: string; count: number; reactedByMe: boolean }[];
  initialRequested: boolean;
}) {
  const [reactions, setReactions] = useState<Record<string, ReactionState>>(
    () =>
      Object.fromEntries(
        initialReactions.map((r) => [r.emoji, { count: r.count, reactedByMe: r.reactedByMe }]),
      ),
  );
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pendingEmoji, setPendingEmoji] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPickerOpen) return;

    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsPickerOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isPickerOpen]);

  const [requested, setRequested] = useState(initialRequested);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  async function toggleReaction(emoji: string) {
    if (pendingEmoji) return;
    setPendingEmoji(emoji);

    const current = reactions[emoji] ?? { count: 0, reactedByMe: false };
    const nextReactedByMe = !current.reactedByMe;
    const nextCount = current.count + (nextReactedByMe ? 1 : -1);

    setReactions((prev) => ({
      ...prev,
      [emoji]: { count: nextCount, reactedByMe: nextReactedByMe },
    }));

    try {
      const supabase = createClient();
      if (nextReactedByMe) {
        const { error } = await supabase
          .from("activity_reactions")
          .insert({ activity_id: activityId, user_id: currentUserId, emoji });
        if (error && error.code !== UNIQUE_VIOLATION) throw error;
      } else {
        const { error } = await supabase
          .from("activity_reactions")
          .delete()
          .eq("activity_id", activityId)
          .eq("user_id", currentUserId)
          .eq("emoji", emoji);
        if (error) throw error;
      }
    } catch (err) {
      console.error("[feed] reaction toggle failed:", err);
      setReactions((prev) => ({
        ...prev,
        [emoji]: current,
      }));
    } finally {
      setPendingEmoji(null);
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

        // Best-effort — a missed KakaoTalk notification shouldn't affect
        // the request itself, which already succeeded above.
        fetch("/api/notify/review-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activityId }),
        }).catch((err) => console.error("[feed] notify review-request failed:", err));
      }
    } catch (err) {
      console.error("[feed] review request toggle failed:", err);
      setRequestError("처리에 실패했어요. 다시 시도해주세요.");
    } finally {
      setIsRequesting(false);
    }
  }

  const activeReactions = REACTION_EMOJIS.filter((emoji) => (reactions[emoji]?.count ?? 0) > 0);

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-2 border-t border-zinc-100 px-4 py-2 text-sm dark:border-zinc-800"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {activeReactions.map((emoji) => {
          const state = reactions[emoji]!;
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => toggleReaction(emoji)}
              disabled={pendingEmoji === emoji}
              className={
                state.reactedByMe
                  ? "flex items-center gap-1 rounded-full border border-orange-400 bg-orange-50 px-2 py-1 font-semibold text-orange-600 dark:bg-orange-950"
                  : "flex items-center gap-1 rounded-full border border-zinc-200 px-2 py-1 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
              }
            >
              <span>{emoji}</span>
              <span>{state.count}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setIsPickerOpen((open) => !open)}
          className="flex items-center justify-center rounded-full border border-dashed border-zinc-300 px-2 py-1 text-zinc-400 dark:border-zinc-700 dark:text-zinc-500"
          aria-label="반응 추가"
        >
          {isPickerOpen ? "✕" : "+"}
        </button>

        {!isOwnActivity && !isSeasonSettled && (
          <button
            type="button"
            onClick={toggleRequest}
            disabled={isRequesting}
            className={
              requested
                ? "ml-auto font-semibold text-red-500"
                : "ml-auto text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            }
          >
            {requested ? "재인증 요청 취소" : "재인증 요청"}
          </button>
        )}
      </div>

      {isPickerOpen && (
        <div className="flex flex-wrap gap-1.5 rounded-xl bg-zinc-50 p-2 dark:bg-zinc-800">
          {REACTION_EMOJIS.map((emoji) => {
            const reactedByMe = reactions[emoji]?.reactedByMe ?? false;
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => toggleReaction(emoji)}
                disabled={pendingEmoji === emoji}
                className={
                  reactedByMe
                    ? "flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-base ring-2 ring-orange-400 dark:bg-orange-950"
                    : "flex h-8 w-8 items-center justify-center rounded-full bg-white text-base dark:bg-zinc-900"
                }
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}

      {requestError && <span className="text-red-500">{requestError}</span>}
    </div>
  );
}
