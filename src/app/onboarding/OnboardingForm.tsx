"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="실명을 입력해주세요"
          autoFocus
          className="rounded-lg border border-zinc-300 px-3 py-3 text-center dark:border-zinc-700 dark:bg-zinc-900 text-lg"
        />
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-orange-500 px-5 py-3.5 font-semibold text-white disabled:opacity-60"
        >
          {isSubmitting ? "저장 중..." : "이 이름으로 시작하기"}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-xl bg-white px-4 py-4 text-lg font-bold text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50">
        {currentName}
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-4">
        본인의 실명이 맞나요?
      </p>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <button
        type="button"
        onClick={() => confirmName(currentName)}
        disabled={isSubmitting}
        className="rounded-xl bg-orange-500 px-5 py-3.5 font-semibold text-white disabled:opacity-60"
      >
        네, 맞아요
      </button>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        disabled={isSubmitting}
        className="rounded-xl bg-zinc-200 px-5 py-3.5 font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      >
        아니요, 실명을 입력할게요
      </button>
    </div>
  );
}
