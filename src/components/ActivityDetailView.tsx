"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CERTIFICATIONS_BUCKET } from "@/lib/photos";
import { formatKoreanDate } from "@/lib/format";
import { Button } from "@/components/Button";
import { ReactionBar, type ReactionState } from "@/components/ReactionBar";

/**
 * The "확장판" of a feed card — same light card look as everywhere else in
 * the app (no separate dark theme), just a bigger photo and room for a
 * proper carousel with arrows/dots instead of a swipe-only strip.
 */
export function ActivityDetailView({
  activityId,
  currentUserId,
  isOwnActivity,
  isSeasonSettled,
  canDelete,
  photoUrls,
  photoStoragePaths,
  initialReactions,
  initialRequested,
  ownerName,
  activityDate,
  distanceKm,
  occurrenceLabel,
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
  ownerName: string;
  activityDate: string;
  distanceKm: number;
  occurrenceLabel: string | null;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [reactions, setReactions] = useState<Record<string, ReactionState>>(() =>
    Object.fromEntries(
      initialReactions.map((r) => [r.emoji, { count: r.count, reactedByMe: r.reactedByMe }]),
    ),
  );
  const [requested, setRequested] = useState(initialRequested);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goTo(nextIndex: number) {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(photoUrls.length - 1, nextIndex));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  }

  async function deleteActivity() {
    setIsDeleting(true);
    setDeleteError(null);

    const supabase = createClient();
    const { error } = await supabase.from("activities").delete().eq("id", activityId);
    if (error) {
      console.error("[activity] delete failed:", error.message);
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
            console.error("[activity] certification photo cleanup failed:", storageError.message);
          }
        });
    }

    router.back();
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      {photoUrls.length > 0 && (
        <div className="relative bg-muted">
          <div
            ref={scrollerRef}
            onScroll={handleScroll}
            className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
          >
            {photoUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt={`인증샷 ${i + 1}/${photoUrls.length}`}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
                className="h-[60vh] w-full shrink-0 snap-center object-contain"
              />
            ))}
          </div>

          {photoUrls.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                aria-label="이전 사진"
                className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg text-ink shadow-sm"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => goTo(index + 1)}
                aria-label="다음 사진"
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg text-ink shadow-sm"
              >
                ›
              </button>
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                {photoUrls.map((_, i) => (
                  <span
                    key={i}
                    className={
                      i === index
                        ? "h-2 w-2 rounded-full bg-primary"
                        : "h-2 w-2 rounded-full bg-white/80 ring-1 ring-black/10"
                    }
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-3 text-base">
        <p>
          <span className="font-semibold text-ink-strong">{ownerName}</span>
          {occurrenceLabel && (
            <span className="ml-2 font-medium text-primary">{occurrenceLabel}</span>
          )}
        </p>
        <span className="text-ink-secondary">
          {formatKoreanDate(activityDate)} · {distanceKm.toFixed(2)}km
        </span>
      </div>

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

      {canDelete && (
        <div className="flex flex-col gap-2 border-t border-border-subtle px-4 py-3">
          {isConfirmingDelete ? (
            <>
              <p className="text-base text-ink-secondary">
                삭제하면 인증샷과 기록이 모두 사라져요. 정말 삭제할까요?
              </p>
              {deleteError && <span className="text-base text-danger">{deleteError}</span>}
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
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              className="text-base font-medium text-ink-tertiary hover:text-danger"
            >
              삭제
            </button>
          )}
        </div>
      )}
    </div>
  );
}
