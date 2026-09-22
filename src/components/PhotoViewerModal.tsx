"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { Button } from "@/components/Button";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

function touchDistance(touches: React.TouchList) {
  const [a, b] = [touches[0], touches[1]];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/**
 * Photo viewer shared by the feed, home's 이번 주 인증 기록, and 시즌 전체
 * 기록 — anywhere a single activity's photos need a closer look. Same light
 * card tone as everywhere else in the app (no dark mode) — think of it as
 * one feed card, just bigger, floating over a dimmed backdrop like
 * StatusBoard's week modal. Multiple photos scroll as a snap carousel with
 * arrow + dot controls.
 *
 * Pinch-zoom is disabled for the app as a whole (viewport meta in
 * layout.tsx) so a stray pinch elsewhere doesn't resize the page — this is
 * the one place it's re-enabled, with its own two-finger pinch + one-finger
 * pan handling (see handleTouch*). Below, `touch-action` on the carousel
 * switches between `pan-x` (scale 1 — let the browser handle the normal
 * swipe-between-photos carousel natively) and `none` (scale > 1 — hand
 * every touch to our own pan/zoom math instead, so the two don't fight
 * over the same gesture).
 */
export function PhotoViewerModal({
  photos,
  caption,
  onClose,
  canDelete,
  onDelete,
  footer,
}: {
  photos: string[];
  caption?: ReactNode;
  onClose: () => void;
  canDelete: boolean;
  onDelete: () => Promise<void>;
  /** Extra controls (the feed's reaction bar) rendered above the delete section — omitted where reactions don't apply (home/history). */
  footer?: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [zoom, setZoom] = useState({ scale: 1, x: 0, y: 0 });
  const scrollerRef = useRef<HTMLDivElement>(null);
  // Refs, not state — updated every touchmove, so re-rendering on every one
  // would be wasteful; only `zoom` (what's actually drawn) needs to.
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(
    null,
  );
  const panRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  // A zoomed-in photo you swiped away from would be a confusing thing to
  // swipe back to, so every slide starts fresh at scale 1 — adjusted here
  // (during render, React's documented pattern for "reset state when a
  // prop/derived value changes") rather than in an effect, which would
  // cost an extra post-commit render pass for the same result.
  const [prevIndex, setPrevIndex] = useState(index);
  if (index !== prevIndex) {
    setPrevIndex(index);
    setZoom({ scale: 1, x: 0, y: 0 });
  }

  // Without this, a vertical swipe meant for the modal (or just a stray
  // touch) scrolls the feed page sitting behind it, which is visible
  // through/after the modal and feels like the modal itself is broken.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goTo(nextIndex: number) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: nextIndex * el.clientWidth, behavior: "smooth" });
  }

  function handleTouchStart(e: ReactTouchEvent<HTMLDivElement>) {
    if (e.touches.length === 2) {
      pinchRef.current = {
        startDist: touchDistance(e.touches),
        startScale: zoom.scale,
      };
    } else if (e.touches.length === 1 && zoom.scale > 1) {
      panRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        originX: zoom.x,
        originY: zoom.y,
      };
    }
  }

  function handleTouchMove(e: ReactTouchEvent<HTMLDivElement>) {
    if (e.touches.length === 2 && pinchRef.current) {
      const { startDist, startScale } = pinchRef.current;
      const scale = Math.min(
        MAX_SCALE,
        Math.max(
          MIN_SCALE,
          startScale * (touchDistance(e.touches) / startDist),
        ),
      );
      setZoom((z) => ({ ...z, scale }));
    } else if (e.touches.length === 1 && panRef.current) {
      const { startX, startY, originX, originY } = panRef.current;
      setZoom((z) => ({
        ...z,
        x: originX + (e.touches[0].clientX - startX),
        y: originY + (e.touches[0].clientY - startY),
      }));
    }
  }

  function handleTouchEnd(e: ReactTouchEvent<HTMLDivElement>) {
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length < 1) {
      panRef.current = null;
      // Pinching back below 1x would otherwise leave the photo permanently
      // shrunk inside its frame — snap back to a clean 1x/centered state.
      setZoom((z) => (z.scale <= MIN_SCALE ? { scale: 1, x: 0, y: 0 } : z));
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDelete();
    } catch {
      setDeleteError("삭제에 실패했어요. 다시 시도해주세요.");
      setIsDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-surface shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-sm text-ink-secondary">{caption}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-ink"
          >
            ✕
          </button>
        </div>

        <div className="relative h-[60vh] shrink-0">
          <div
            ref={scrollerRef}
            onScroll={handleScroll}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: zoom.scale > 1 ? "none" : "pan-x" }}
            className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
          >
            {photos.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt={`인증샷 ${i + 1}/${photos.length}`}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                style={{
                  WebkitTouchCallout: "none",
                  WebkitUserSelect: "none",
                  userSelect: "none",
                  transform:
                    i === index
                      ? `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`
                      : undefined,
                }}
                className="h-full w-full shrink-0 snap-center object-contain"
              />
            ))}
          </div>

          {photos.length > 1 && (
            <>
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => goTo(index - 1)}
                  aria-label="이전 사진"
                  className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg text-ink shadow-sm"
                >
                  ‹
                </button>
              )}
              {index < photos.length - 1 && (
                <button
                  type="button"
                  onClick={() => goTo(index + 1)}
                  aria-label="다음 사진"
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg text-ink shadow-sm"
                >
                  ›
                </button>
              )}
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                {photos.map((url, i) => (
                  <span
                    key={url}
                    className={
                      i === index
                        ? "h-1.5 w-1.5 rounded-full bg-primary"
                        : "h-1.5 w-1.5 rounded-full bg-white/80 ring-1 ring-black/10"
                    }
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 overflow-y-auto">
          {footer}

          {canDelete && (
            <div className="flex flex-col gap-2 px-4 py-3">
              {isConfirmingDelete ? (
                <>
                  <p className="text-sm text-ink-secondary">
                    삭제하면 인증샷과 기록이 모두 사라져요. 정말 삭제할까요?
                  </p>
                  {deleteError && (
                    <span className="text-sm text-danger">{deleteError}</span>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      size="auto"
                      className="flex-1"
                      onClick={handleDelete}
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
                  className="text-sm font-medium text-ink-tertiary hover:text-danger"
                >
                  삭제
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
