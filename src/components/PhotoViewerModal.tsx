"use client";

import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/Button";

/**
 * Full-screen photo viewer shared by the feed, home's 이번 주 인증 기록, and
 * 시즌 전체 기록 — anywhere a single activity's photos need a closer look.
 * Multiple photos scroll as a snap carousel. Zooming in on a photo is just
 * the browser's native pinch-zoom — nothing here blocks it (no
 * touch-action override, no fixed overflow on the image itself), so there's
 * no custom gesture code to maintain.
 */
export function PhotoViewerModal({
  photos,
  caption,
  onClose,
  canDelete,
  onDelete,
}: {
  photos: string[];
  caption?: ReactNode;
  onClose: () => void;
  canDelete: boolean;
  onDelete: () => Promise<void>;
}) {
  const [index, setIndex] = useState(0);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
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
    <div className="fixed inset-0 z-50 flex flex-col bg-black" onClick={onClose}>
      <div
        className="flex items-center justify-between px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm text-white/70">
          {caption}
          {photos.length > 1 && (
            <span className="ml-2 text-white/50">
              {index + 1} / {photos.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-lg text-white"
        >
          ✕
        </button>
      </div>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        onClick={(e) => e.stopPropagation()}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-auto"
      >
        {photos.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            src={url}
            alt={`인증샷 ${i + 1}/${photos.length}`}
            className="h-full w-full shrink-0 snap-center object-contain"
          />
        ))}
      </div>

      {canDelete && (
        <div
          className="flex flex-col gap-2 px-4 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          {isConfirmingDelete ? (
            <>
              <p className="text-sm text-white/70">
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
              className="text-sm font-medium text-white/70 hover:text-danger"
            >
              삭제
            </button>
          )}
        </div>
      )}
    </div>
  );
}
