import type { SupabaseClient } from "@supabase/supabase-js";

export const CERTIFICATIONS_BUCKET = "certifications";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Sorts activity photos by their intended display order and resolves each
 * to a signed URL, dropping any that failed to sign. Works with either the
 * browser or server Supabase client since both share the storage API.
 */
export async function getSignedPhotoUrls(
  supabase: SupabaseClient,
  photos: { storage_path: string; sort_order: number }[],
): Promise<string[]> {
  const sorted = [...photos].sort((a, b) => a.sort_order - b.sort_order);

  const signedUrls = await Promise.all(
    sorted.map(async (photo) => {
      const { data } = await supabase.storage
        .from(CERTIFICATIONS_BUCKET)
        .createSignedUrl(photo.storage_path, SIGNED_URL_TTL_SECONDS);
      return data?.signedUrl ?? null;
    }),
  );

  return signedUrls.filter((url): url is string => !!url);
}
