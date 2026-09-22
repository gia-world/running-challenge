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

export type ReactionState = { count: number; reactedByMe: boolean };

/**
 * The feed card's reaction/재인증 요청 row — a controlled component so the
 * same reaction data can be shown both in the collapsed feed card and
 * inside PhotoViewerModal without the two drifting out of sync. `reactions`
 * and `requested` live in the parent (FeedCard); only picker-open/pending
 * state, which resets harmlessly whenever this remounts, stays local here.
 */
export function ReactionBar({
  activityId,
  currentUserId,
  isOwnActivity,
  isSeasonSettled,
  reactions,
  onReactionsChange,
  requested,
  onRequestedChange,
  dark = false,
}: {
  activityId: string;
  currentUserId: string;
  isOwnActivity: boolean;
  isSeasonSettled: boolean;
  reactions: Record<string, ReactionState>;
  onReactionsChange: (next: Record<string, ReactionState>) => void;
  requested: boolean;
  onRequestedChange: (next: boolean) => void;
  /** The modal renders this against a dark backdrop — swaps text/border colors to match. */
  dark?: boolean;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  // A set, not a single value — multi-select means several emoji requests
  // can be in flight at once, and each toggle must only block repeat taps
  // on its own emoji, not on whichever one happened to be picked first.
  const [pendingEmojis, setPendingEmojis] = useState<ReadonlySet<string>>(new Set());
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPickerOpen) return;

    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsPickerOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    // Bring the picker fully into view as soon as it opens — it renders at
    // the bottom of the card, which a card near the bottom of the feed can
    // push past the viewport edge otherwise.
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isPickerOpen]);

  async function toggleReaction(emoji: string) {
    if (pendingEmojis.has(emoji)) return;
    setPendingEmojis((prev) => new Set(prev).add(emoji));

    const current = reactions[emoji] ?? { count: 0, reactedByMe: false };
    const nextReactedByMe = !current.reactedByMe;
    const nextCount = current.count + (nextReactedByMe ? 1 : -1);

    onReactionsChange({
      ...reactions,
      [emoji]: { count: nextCount, reactedByMe: nextReactedByMe },
    });

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
      onReactionsChange({ ...reactions, [emoji]: current });
    } finally {
      setPendingEmojis((prev) => {
        const next = new Set(prev);
        next.delete(emoji);
        return next;
      });
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
        onRequestedChange(false);
      } else {
        const { error } = await supabase
          .from("activity_review_requests")
          .insert({ activity_id: activityId, requested_by: currentUserId });
        if (error && error.code !== UNIQUE_VIOLATION) throw error;
        onRequestedChange(true);

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

  const chipInactive = dark
    ? "flex items-center gap-1 rounded-full border border-white/20 px-2 py-1 text-white/70"
    : "flex items-center gap-1 rounded-full border border-border px-2 py-1 text-ink-secondary";
  const addButtonClass = dark
    ? "flex items-center justify-center rounded-full border border-dashed border-white/30 px-2 py-1 text-white/60"
    : "flex items-center justify-center rounded-full border border-dashed border-border-strong px-2 py-1 text-ink-tertiary";
  const requestInactiveClass = dark
    ? "ml-auto text-white/60 hover:text-white"
    : "ml-auto text-ink-tertiary hover:text-ink";
  const pickerWrapClass = dark ? "flex flex-wrap gap-1.5 rounded-xl bg-white/10 p-2" : "flex flex-wrap gap-1.5 rounded-xl bg-subtle p-2";
  const pickerInactiveClass = dark
    ? "flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-base"
    : "flex h-8 w-8 items-center justify-center rounded-full bg-surface text-base";

  return (
    <div
      ref={containerRef}
      className={
        dark
          ? "flex flex-col gap-2 px-4 py-3 text-sm"
          : "flex flex-col gap-2 border-t border-border-subtle px-4 py-2 text-sm"
      }
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Hidden while the picker's open so picking emojis (which changes
            how many chips there are) never reflows this row mid-selection —
            it only reappears once the picker closes. */}
        {!isPickerOpen &&
          activeReactions.map((emoji) => {
            const state = reactions[emoji]!;
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => toggleReaction(emoji)}
                disabled={pendingEmojis.has(emoji)}
                className={
                  state.reactedByMe
                    ? "flex items-center gap-1 rounded-full border border-primary-400 bg-primary-50 px-2 py-1 font-semibold text-primary-600"
                    : chipInactive
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
          className={addButtonClass}
          aria-label="반응 추가"
        >
          {isPickerOpen ? "✕" : "+"}
        </button>

        {!isOwnActivity && !isSeasonSettled && (
          <button
            type="button"
            onClick={toggleRequest}
            disabled={isRequesting}
            className={requested ? "ml-auto font-semibold text-danger" : requestInactiveClass}
          >
            {requested ? "재인증 요청 취소" : "재인증 요청"}
          </button>
        )}
      </div>

      {isPickerOpen && (
        <div className={pickerWrapClass}>
          {REACTION_EMOJIS.map((emoji) => {
            const reactedByMe = reactions[emoji]?.reactedByMe ?? false;
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => toggleReaction(emoji)}
                disabled={pendingEmojis.has(emoji)}
                className={
                  reactedByMe
                    ? "flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-base ring-2 ring-primary-400"
                    : pickerInactiveClass
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
