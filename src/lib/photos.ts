import type { SupabaseClient } from "@supabase/supabase-js";

export const CERTIFICATIONS_BUCKET = "certifications";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

type PhotoRow = { storage_path: string; sort_order: number };

async function signPaths(supabase: SupabaseClient, paths: string[]): Promise<string[]> {
  const signedUrls = await Promise.all(
    paths.map(async (path) => {
      const { data } = await supabase.storage
        .from(CERTIFICATIONS_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      return data?.signedUrl ?? null;
    }),
  );

  return signedUrls.filter((url): url is string => !!url);
}

/**
 * Sorts activity photos by their intended display order and resolves each
 * to a signed URL, dropping any that failed to sign. Works with either the
 * browser or server Supabase client since both share the storage API.
 * Full-size — only for views the viewer actually opened (PhotoViewerModal,
 * admin review's carousel), never an eagerly-rendered grid.
 */
export async function getSignedPhotoUrls(
  supabase: SupabaseClient,
  photos: PhotoRow[],
): Promise<string[]> {
  const sorted = [...photos].sort((a, b) => a.sort_order - b.sort_order);
  return signPaths(supabase, sorted.map((p) => p.storage_path));
}

/**
 * Same as `getSignedPhotoUrls`, but for the feed grid's always-visible
 * thumbnails — resolves each photo's small `thumbnail_storage_path` instead
 * of the full image, falling back to the full path for photos uploaded
 * before thumbnails existed (null thumbnail_storage_path).
 */
export async function getSignedThumbnailUrls(
  supabase: SupabaseClient,
  photos: (PhotoRow & { thumbnail_storage_path: string | null })[],
): Promise<string[]> {
  const sorted = [...photos].sort((a, b) => a.sort_order - b.sort_order);
  return signPaths(supabase, sorted.map((p) => p.thumbnail_storage_path ?? p.storage_path));
}
