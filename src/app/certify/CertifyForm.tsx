"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import { todayInSeoul } from "@/lib/week";

const UNIQUE_VIOLATION = "23505";

export function CertifyForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activityDate, setActivityDate] = useState(todayInSeoul());
  const [distanceKm, setDistanceKm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("인증샷을 선택해주세요.");
      return;
    }
    const distance = Number(distanceKm);
    if (!distance || distance < 5) {
      setError("거리는 5km 이상이어야 해요.");
      return;
    }

    setIsSubmitting(true);

    let compressed: Blob;
    try {
      compressed = await compressImage(file);
    } catch {
      setError("사진을 읽을 수 없어요. 다른 사진을 선택해주세요.");
      setIsSubmitting(false);
      return;
    }

    const supabase = createClient();
    const path = `${userId}/${activityDate}-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("certifications")
      .upload(path, compressed, { contentType: "image/jpeg" });

    if (uploadError) {
      setError("사진 업로드에 실패했어요. 다시 시도해주세요.");
      setIsSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("activities").insert({
      user_id: userId,
      activity_date: activityDate,
      distance_km: distance,
      photo_url: path,
      status: "pending",
    });

    if (insertError) {
      setError(
        insertError.code === UNIQUE_VIOLATION
          ? "오늘은 이미 인증을 올렸어요."
          : "인증 등록에 실패했어요. 다시 시도해주세요.",
      );
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
        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">인증샷을 올렸어요!</p>
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
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">인증샷</span>
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="선택한 인증샷"
            className="aspect-square w-full rounded-xl object-cover"
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 px-4 text-center text-sm text-zinc-400 dark:border-zinc-700">
            날짜·거리가 보이는 스크린샷을 선택하세요
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="text-sm"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">날짜</span>
        <input
          type="date"
          value={activityDate}
          max={todayInSeoul()}
          onChange={(e) => setActivityDate(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">거리 (km)</span>
        <input
          type="number"
          step="0.1"
          min="5"
          inputMode="decimal"
          value={distanceKm}
          onChange={(e) => setDistanceKm(e.target.value)}
          placeholder="5.0"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-orange-500 px-5 py-3.5 font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "업로드 중..." : "인증하기"}
      </button>
    </form>
  );
}
