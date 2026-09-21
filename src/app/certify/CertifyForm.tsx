"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import { CERTIFICATIONS_BUCKET } from "@/lib/photos";
import { todayInSeoul } from "@/lib/week";
import { ErrorBanner } from "@/components/ErrorBanner";
import { BottomSheet } from "@/components/BottomSheet";
import { RenewalToggle } from "@/components/RenewalToggle";
import { Input } from "@/components/Input";

type PendingPhoto = { file: File; previewUrl: string };

const UNIQUE_VIOLATION = "23505";
const ALREADY_CERTIFIED_MESSAGE = "오늘은 이미 인증하셨어요.";

export function CertifyForm({
  userId,
  seasonId,
  alreadyCertifiedToday,
  achievedThisWeek,
  weeklyGoal,
  maxActivityDate,
  showRenewalPrompt,
}: {
  userId: string;
  seasonId: string;
  alreadyCertifiedToday: boolean;
  achievedThisWeek: number;
  weeklyGoal: number;
  maxActivityDate: string;
  showRenewalPrompt: boolean;
}) {
  const router = useRouter();
  const today = todayInSeoul();
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [activityDate, setActivityDate] = useState(maxActivityDate);
  const [distanceKm, setDistanceKm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [completedWeekGoal, setCompletedWeekGoal] = useState(false);
  const [renewalSheetDismissed, setRenewalSheetDismissed] = useState(false);

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
        .from(CERTIFICATIONS_BUCKET)
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
        status: "approved",
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

    // Only today's upload counts toward this week's live goal tracking —
    // a backfilled past date could belong to an already-settled week we
    // have no cheap way to re-check here.
    if (
      activityDate === today &&
      achievedThisWeek < weeklyGoal &&
      achievedThisWeek + 1 >= weeklyGoal
    ) {
      setCompletedWeekGoal(true);
    }
    setIsDone(true);
    setIsSubmitting(false);
  }

  if (isDone) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="animate-stamp-in flex h-24 w-24 items-center justify-center rounded-full border-4 border-primary text-base font-extrabold text-primary">
          인증완료
        </div>
        <p className="text-lg font-bold text-ink-strong">
          인증샷을 올렸어요!
        </p>
        <p className="text-base text-ink-secondary">
          바로 이번 주 기록에 반영돼요. 팀원이 이상하다고 느끼면
          <br /> 재인증을 요청할 수 있어요.
        </p>
        {completedWeekGoal && (
          <p className="animate-badge-pop rounded-full bg-primary-50 px-4 py-2 text-sm font-bold text-primary-600">
            🎉 이번 주 목표 {weeklyGoal}/{weeklyGoal} 달성!
          </p>
        )}
        <button
          type="button"
          onClick={() => router.push("/home")}
          className="mt-4 rounded-xl bg-primary px-5 py-3 font-semibold text-white"
        >
          홈으로 가기
        </button>

        {activityDate === today && showRenewalPrompt && !renewalSheetDismissed && (
          <BottomSheet onClose={() => setRenewalSheetDismissed(true)}>
            <RenewalToggle
              seasonId={seasonId}
              userId={userId}
              initialChoice={null}
              onAnswered={() => setRenewalSheetDismissed(true)}
            />
          </BottomSheet>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {isBlocked && (
        <ErrorBanner>
          오늘은 이미 인증하셨어요.
          <br /> 다른 날짜를 선택하면 추가로 인증할 수 있어요.
        </ErrorBanner>
      )}

      <label className="flex flex-col gap-2">
        <span className="text-base font-medium text-ink">
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
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-sm font-bold text-white"
                  aria-label="사진 삭제"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-2xl border-2 border-dashed border-border-strong px-4 text-center text-sm text-ink-tertiary">
            날짜, 거리, 페이스가 보이는 스크린샷을 선택하세요
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={isBlocked}
          onChange={handleFileChange}
          className="sr-only"
        />
      </label>

      <Input
        type="date"
        label="날짜"
        labelClassName="text-base font-medium text-ink"
        value={activityDate}
        max={maxActivityDate}
        onChange={(e) => setActivityDate(e.target.value)}
        className="px-3 py-2.5 text-sm"
      />

      <Input
        type="number"
        step="0.1"
        min="5"
        inputMode="decimal"
        label="거리 (km)"
        labelClassName="text-base font-medium text-ink"
        value={distanceKm}
        onChange={(e) => setDistanceKm(e.target.value)}
        placeholder="5.0"
        disabled={isBlocked}
        className="px-3 py-2.5 text-sm"
      />

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <button
        type="submit"
        disabled={isSubmitting || isBlocked}
        className="rounded-xl bg-primary px-5 py-3.5 font-semibold text-white disabled:opacity-60"
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
