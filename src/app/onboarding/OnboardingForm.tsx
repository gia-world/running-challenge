"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/Input";

export function OnboardingForm({
  userId,
  currentName,
}: {
  userId: string;
  currentName: string;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmName(finalName: string) {
    setIsSubmitting(true);
    setError(null);
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ name: finalName, name_confirmed: true })
      .eq("id", userId);

    if (updateError) {
      setError("저장에 실패했어요. 다시 시도해주세요.");
      setIsSubmitting(false);
      return;
    }

    router.push("/home");
    router.refresh();
  }

  function handleSubmitRealName(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("이름을 입력해주세요.");
      return;
    }
    confirmName(trimmed);
  }

  if (isEditing) {
    return (
      <form onSubmit={handleSubmitRealName} className="flex flex-col gap-4">
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="실명을 입력해주세요"
          autoFocus
          className="px-3 py-3 text-center text-lg"
        />
        {error && (
          <p className="text-sm text-danger">{error}</p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-primary px-5 py-3.5 font-semibold text-white disabled:opacity-60"
        >
          {isSubmitting ? "저장 중..." : "이 이름으로 시작하기"}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-2xl border border-border bg-surface px-4 py-4 text-lg font-bold text-ink-strong">
        {currentName}
      </p>
      <p className="text-base text-ink-secondary mt-4">
        본인의 실명이 맞나요?
      </p>

      {error && (
        <p className="text-sm text-danger">{error}</p>
      )}

      <button
        type="button"
        onClick={() => confirmName(currentName)}
        disabled={isSubmitting}
        className="rounded-xl bg-primary px-5 py-3.5 font-semibold text-white disabled:opacity-60"
      >
        네, 맞아요
      </button>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        disabled={isSubmitting}
        className="rounded-xl bg-muted-strong px-5 py-3.5 font-semibold text-ink"
      >
        아니요, 실명을 입력할게요
      </button>
    </div>
  );
}
