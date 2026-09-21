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
    // Close the picker immediately on pick — leaving it open let a post's
    // first reaction grow the row (wrapping to a second line) while the
    // picker was still expanded below it, so the outside-click listener
    // then yanked the picker shut on the next touch (often a scroll),
    // reading as if the tap itself had been undone.
    setIsPickerOpen(false);

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
      className="flex flex-col gap-2 border-t border-border-subtle px-4 py-2 text-sm"
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
                  ? "flex items-center gap-1 rounded-full border border-primary-400 bg-primary-50 px-2 py-1 font-semibold text-primary-600"
                  : "flex items-center gap-1 rounded-full border border-border px-2 py-1 text-ink-secondary"
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
          className="flex items-center justify-center rounded-full border border-dashed border-border-strong px-2 py-1 text-ink-tertiary"
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
                ? "ml-auto font-semibold text-danger"
                : "ml-auto text-ink-tertiary hover:text-ink"
            }
          >
            {requested ? "재인증 요청 취소" : "재인증 요청"}
          </button>
        )}
      </div>

      {isPickerOpen && (
        <div className="flex flex-wrap gap-1.5 rounded-xl bg-subtle p-2">
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
                    ? "flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-base ring-2 ring-primary-400"
                    : "flex h-8 w-8 items-center justify-center rounded-full bg-surface text-base"
                }
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}

      {requestError && <span className="text-danger">{requestError}</span>}
    </div>
  );
}
