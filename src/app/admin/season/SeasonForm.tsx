"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { defaultSeasonEndDate } from "@/lib/season";
import { todayInSeoul } from "@/lib/week";

type ExistingSeason = { id: string; start_date: string; end_date: string };

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && bStart <= aEnd;
}

export function SeasonForm({
  teamId,
  existingSeasons,
  previousSeasonId,
}: {
  teamId: string;
  existingSeasons: ExistingSeason[];
  previousSeasonId: string | null;
}) {
  const router = useRouter();
  const today = todayInSeoul();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(defaultSeasonEndDate(today));
  const [copyPrevious, setCopyPrevious] = useState(true);
  const [needsOverlapConfirm, setNeedsOverlapConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleStartDateChange(value: string) {
    setStartDate(value);
    setEndDate(defaultSeasonEndDate(value));
    setNeedsOverlapConfirm(false);
  }

  async function createSeason() {
    setIsSubmitting(true);
    setError(null);
    const supabase = createClient();

    const { data: season, error: insertError } = await supabase
      .from("seasons")
      .insert({ team_id: teamId, start_date: startDate, end_date: endDate })
      .select("id")
      .single();

    if (insertError || !season) {
      setError("시즌 생성에 실패했어요.");
      setIsSubmitting(false);
      return;
    }

    if (copyPrevious && previousSeasonId) {
      const { data: previousMembers } = await supabase
        .from("season_memberships")
        .select("user_id")
        .eq("season_id", previousSeasonId);

      if (previousMembers && previousMembers.length > 0) {
        await supabase
          .from("season_memberships")
          .insert(previousMembers.map((m) => ({ season_id: season.id, user_id: m.user_id })));
      }
    }

    setIsSubmitting(false);
    router.push(`/admin/season/${season.id}`);
    router.refresh();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const overlap = existingSeasons.some((s) =>
      rangesOverlap(startDate, endDate, s.start_date, s.end_date),
    );
    if (overlap && !needsOverlapConfirm) {
      setNeedsOverlapConfirm(true);
      return;
    }
    createSeason();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900"
    >
      <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">새 시즌 만들기</h2>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">시작일</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => handleStartDateChange(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          종료일 (4주 후 자동 계산, 수정 가능)
        </span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setNeedsOverlapConfirm(false);
          }}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
      </label>

      {previousSeasonId && (
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={copyPrevious}
            onChange={(e) => setCopyPrevious(e.target.checked)}
          />
          지난 시즌 참여자 명단 그대로 가져오기
        </label>
      )}

      {needsOverlapConfirm && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          기간이 겹치는 시즌이 있어요. 그래도 만들까요?
        </p>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "생성 중..." : needsOverlapConfirm ? "그래도 만들기" : "시즌 만들기"}
      </button>
    </form>
  );
}
