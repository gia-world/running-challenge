"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CERTIFICATIONS_BUCKET } from "@/lib/photos";
import { PhotoViewerModal } from "@/components/PhotoViewerModal";

/**
 * 1:1 square thumbnail for a feed card — one photo fills the square, more
 * than one lays out as a collage. Tapping it opens the shared
 * PhotoViewerModal with the full-resolution carousel + delete.
 */
export function FeedPhotoThumbnail({
  activityId,
  photoUrls,
  photoStoragePaths,
  canDelete,
  caption,
  alt,
}: {
  activityId: string;
  photoUrls: string[];
  photoStoragePaths: string[];
  canDelete: boolean;
  caption?: ReactNode;
  alt: string;
}) {
  const router = useRouter();
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  async function deleteActivity() {
    const supabase = createClient();
    const { error } = await supabase.from("activities").delete().eq("id", activityId);
    if (error) {
      console.error("[feed] activity delete failed:", error.message);
      throw error;
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

  if (photoUrls.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsViewerOpen(true)}
        className="grid aspect-square w-full grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden bg-muted"
      >
        {photoUrls.length === 1 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrls[0]} alt={alt} className="col-span-2 row-span-2 h-full w-full object-cover" />
        ) : photoUrls.length === 2 ? (
          photoUrls.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt={`${alt} ${i + 1}`} className="row-span-2 h-full w-full object-cover" />
          ))
        ) : photoUrls.length === 3 ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrls[0]} alt={`${alt} 1`} className="row-span-2 h-full w-full object-cover" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrls[1]} alt={`${alt} 2`} className="h-full w-full object-cover" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrls[2]} alt={`${alt} 3`} className="h-full w-full object-cover" />
          </>
        ) : (
          photoUrls.slice(0, 4).map((url, i) => (
            <div key={url} className="relative h-full w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`${alt} ${i + 1}`} className="h-full w-full object-cover" />
              {i === 3 && photoUrls.length > 4 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white">
                  +{photoUrls.length - 4}
                </div>
              )}
            </div>
          ))
        )}
      </button>

      {isViewerOpen && (
        <PhotoViewerModal
          photos={photoUrls}
          caption={caption}
          canDelete={canDelete}
          onClose={() => setIsViewerOpen(false)}
          onDelete={deleteActivity}
        />
      )}
    </>
  );
}
