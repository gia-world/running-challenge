// 인증샷은 러닝 앱 화면(거리/페이스)을 확인하는 용도라 어차피 원본
// 화질이 필요 없다 — 그리드 썸네일과 모달 확대(1~4배) 양쪽 다 이 한
// 사이즈로 같이 쓴다. Supabase 무료 플랜 egress 한도를 넘겨서 기존
// 1600/0.8(장당 평균 175KB)보다 더 줄였다 — 그래도 핀치줌했을 때
// 숫자를 읽을 수 있는 선은 유지.
const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.7;

/** Resizes and re-encodes an image client-side before upload to keep Storage usage small. */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
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
    canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", JPEG_QUALITY);
  });
}
