const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.7;

// 피드 그리드는 작은 정사각형 썸네일 하나 보여주려고 원본 전체를 그대로
// 받아왔었다 — 스크롤할 때마다 Supabase 무료 플랜 egress(월 5GB)를
// 빠르게 갉아먹은 주범. 모바일 화면에서 2배 레티나로 봐도 충분한
// 크기(480px)로 따로 작게 만들어서 그리드 전용으로 쓴다.
const THUMBNAIL_MAX_DIMENSION = 480;
const THUMBNAIL_JPEG_QUALITY = 0.6;

async function resizeAndEncode(file: File, maxDimension: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", quality);
  });
}

/**
 * Resizes and re-encodes an image client-side before upload to keep Storage
 * usage small. 인증샷은 러닝 앱 화면(거리/페이스) 확인용이라 원본급
 * 화질이 필요 없다 — 핀치줌(모달)으로 숫자를 읽을 수 있는 선까지만 유지.
 */
export async function compressImage(file: File): Promise<Blob> {
  return resizeAndEncode(file, MAX_DIMENSION, JPEG_QUALITY);
}

/** 피드 그리드 전용 작은 썸네일 — PhotoViewerModal 같은 확대 보기에는 쓰지 않는다. */
export async function compressThumbnail(file: File): Promise<Blob> {
  return resizeAndEncode(file, THUMBNAIL_MAX_DIMENSION, THUMBNAIL_JPEG_QUALITY);
}
