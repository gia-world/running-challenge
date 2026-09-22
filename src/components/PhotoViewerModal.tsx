"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/Button";

/**
 * Photo viewer shared by the feed, home's 이번 주 인증 기록, and 시즌 전체
 * 기록 — anywhere a single activity's photos need a closer look. Same light
 * card tone as everywhere else in the app (no dark mode) — think of it as
 * one feed card, just bigger, floating over a dimmed backdrop like
 * StatusBoard's week modal. Multiple photos scroll as a snap carousel with
 * arrow + dot controls. Zooming in on a photo is just the browser's native
 * pinch-zoom — nothing here blocks it (no touch-action override), so
 * there's no custom gesture code to maintain.
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
  const scrollerRef = useRef<HTMLDivElement>(null);

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
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-lg text-ink"
          >
            ✕
          </button>
        </div>

        <div className="relative h-[60vh] shrink-0 bg-muted">
          <div
            ref={scrollerRef}
            onScroll={handleScroll}
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
                style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
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
                  {deleteError && <span className="text-sm text-danger">{deleteError}</span>}
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
