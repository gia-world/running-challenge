"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import { todayInSeoul } from "@/lib/week";

type PendingPhoto = { file: File; previewUrl: string };

const UNIQUE_VIOLATION = "23505";
const ALREADY_CERTIFIED_MESSAGE = "오늘은 이미 인증하셨어요.";

export function CertifyForm({
  userId,
  seasonId,
  alreadyCertifiedToday,
}: {
  userId: string;
  seasonId: string;
  alreadyCertifiedToday: boolean;
}) {
  const router = useRouter();
  const today = todayInSeoul();
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [activityDate, setActivityDate] = useState(today);
  const [distanceKm, setDistanceKm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  const isBlocked = activityDate === today && alreadyCertifiedToday;

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    setPhotos(
      selected.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    );
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (isBlocked) {
      setError(ALREADY_CERTIFIED_MESSAGE);
      return;
    }

    if (photos.length === 0) {
      setError("인증샷을 선택해주세요.");
      return;
    }
    const distance = Number(distanceKm);
    if (!distance || distance < 5) {
      setError("거리는 5km 이상이어야 해요.");
      return;
    }

    setIsSubmitting(true);

    let compressed: Blob[];
    try {
      compressed = await Promise.all(photos.map((p) => compressImage(p.file)));
    } catch {
      setError("사진을 읽을 수 없어요. 다른 사진을 선택해주세요.");
      setIsSubmitting(false);
      return;
    }

    const supabase = createClient();
    const uploadedPaths: string[] = [];
    for (const [index, blob] of compressed.entries()) {
      const path = `${userId}/${activityDate}-${Date.now()}-${index}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("certifications")
        .upload(path, blob, { contentType: "image/jpeg" });

      if (uploadError) {
        setError("사진 업로드에 실패했어요. 다시 시도해주세요.");
        setIsSubmitting(false);
        return;
      }
      uploadedPaths.push(path);
    }

    const { data: activity, error: insertError } = await supabase
      .from("activities")
      .insert({
        user_id: userId,
        season_id: seasonId,
        activity_date: activityDate,
        distance_km: distance,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !activity) {
      setError(
        insertError?.code === UNIQUE_VIOLATION
          ? "이 날은 이미 인증하셨어요."
          : "인증 등록에 실패했어요. 다시 시도해주세요.",
      );
      setIsSubmitting(false);
      return;
    }

    const { error: photosError } = await supabase
      .from("activity_photos")
      .insert(
        uploadedPaths.map((storage_path, sort_order) => ({
          activity_id: activity.id,
          storage_path,
          sort_order,
        })),
      );

    if (photosError) {
      setError("사진 등록에 실패했어요. 다시 시도해주세요.");
      setIsSubmitting(false);
      return;
    }

    setIsDone(true);
    setIsSubmitting(false);
  }

  if (isDone) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-3xl">🎉</p>
        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          인증샷을 올렸어요!
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          관리자 심사 후 이번 주 기록에 반영돼요.
        </p>
        <button
          type="button"
          onClick={() => router.push("/home")}
          className="mt-4 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white"
        >
          홈으로 가기
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {isBlocked && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          오늘은 이미 인증하셨어요.
          <br /> 다른 날짜를 선택하면 추가로 인증할 수 있어요.
        </p>
      )}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          인증샷 (여러 장 가능)
        </span>
        {photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <div key={photo.previewUrl} className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.previewUrl}
                  alt={`선택한 인증샷 ${index + 1}`}
                  className="h-full w-full rounded-xl object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white"
                  aria-label="사진 삭제"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 px-4 text-center text-sm text-zinc-400 dark:border-zinc-700">
            날짜, 거리, 페이스가 보이는 스크린샷을 선택하세요
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          disabled={isBlocked}
          onChange={handleFileChange}
          className="text-sm"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          날짜
        </span>
        <input
          type="date"
          value={activityDate}
          max={today}
          onChange={(e) => setActivityDate(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          거리 (km)
        </span>
        <input
          type="number"
          step="0.1"
          min="5"
          inputMode="decimal"
          value={distanceKm}
          onChange={(e) => setDistanceKm(e.target.value)}
          placeholder="5.0"
          disabled={isBlocked}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || isBlocked}
        className="rounded-xl bg-orange-500 px-5 py-3.5 font-semibold text-white disabled:opacity-60"
      >
        {isBlocked
          ? "오늘은 이미 인증했어요"
          : isSubmitting
            ? "업로드 중..."
            : "인증하기"}
      </button>
    </form>
  );
}
