"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CERTIFICATIONS_BUCKET } from "@/lib/photos";
import { Button } from "@/components/Button";

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
  photoStoragePaths,
  initialReactions,
  initialRequested,
}: {
  activityId: string;
  currentUserId: string;
  isOwnActivity: boolean;
  isSeasonSettled: boolean;
  photoStoragePaths: string[];
  initialReactions: { emoji: string; count: number; reactedByMe: boolean }[];
  initialRequested: boolean;
}) {
  const router = useRouter();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, ReactionState>>(
    () =>
      Object.fromEntries(
        initialReactions.map((r) => [r.emoji, { count: r.count, reactedByMe: r.reactedByMe }]),
      ),
  );
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  // A set, not a single value — multi-select means several emoji requests
  // can be in flight at once, and each toggle must only block repeat taps
  // on its own emoji, not on whichever one happened to be picked first.
  const [pendingEmojis, setPendingEmojis] = useState<ReadonlySet<string>>(new Set());
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

  const [requested, setRequested] = useState(initialRequested);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  async function toggleReaction(emoji: string) {
    if (pendingEmojis.has(emoji)) return;
    setPendingEmojis((prev) => new Set(prev).add(emoji));

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

  async function deleteActivity() {
    setIsDeleting(true);
    setDeleteError(null);

    const supabase = createClient();
    const { error } = await supabase.from("activities").delete().eq("id", activityId);

    if (error) {
      console.error("[feed] activity delete failed:", error.message);
      setDeleteError("삭제에 실패했어요. 다시 시도해주세요.");
      setIsDeleting(false);
      return;
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

  if (isConfirmingDelete) {
    return (
      <div className="flex flex-col gap-2 border-t border-border-subtle px-4 py-2 text-sm">
        <p className="text-ink-secondary">
          삭제하면 인증샷과 기록이 모두 사라져요. 정말 삭제할까요?
        </p>
        {deleteError && <span className="text-danger">{deleteError}</span>}
        <div className="flex gap-2">
          <Button
            variant="danger"
            size="auto"
            className="flex-1"
            onClick={deleteActivity}
            disabled={isDeleting}
          >
            {isDeleting ? "삭제 중..." : "삭제"}
          </Button>
          <Button
            variant="secondary"
            size="auto"
            className="flex-1"
            onClick={() => {
              setIsConfirmingDelete(false);
              setDeleteError(null);
            }}
            disabled={isDeleting}
          >
            닫기
          </Button>
        </div>
      </div>
    );
  }

  const activeReactions = REACTION_EMOJIS.filter((emoji) => (reactions[emoji]?.count ?? 0) > 0);

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-2 border-t border-border-subtle px-4 py-2 text-sm"
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

        {isOwnActivity && !isSeasonSettled && (
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            className="ml-auto text-ink-tertiary hover:text-danger"
          >
            삭제
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
                disabled={pendingEmojis.has(emoji)}
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
