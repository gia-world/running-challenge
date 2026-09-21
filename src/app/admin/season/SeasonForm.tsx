"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { defaultSeasonEndDate } from "@/lib/season";
import { todayInSeoul } from "@/lib/week";
import {
  SeasonFeeFields,
  DEFAULT_ENTRY_FEE,
  DEFAULT_REFUND_PER_CERTIFICATION,
} from "@/components/SeasonFeeFields";

type ExistingSeason = { id: string; start_date: string; end_date: string };

function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
) {
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
  const [entryFee, setEntryFee] = useState(DEFAULT_ENTRY_FEE);
  const [refundPerCertification, setRefundPerCertification] = useState(
    DEFAULT_REFUND_PER_CERTIFICATION,
  );
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
      .insert({
        team_id: teamId,
        start_date: startDate,
        end_date: endDate,
        entry_fee: entryFee ? Number(entryFee) : null,
        refund_per_certification: refundPerCertification
          ? Number(refundPerCertification)
          : null,
      })
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
        .eq("season_id", previousSeasonId)
        .eq("renew_next_season", true);

      if (previousMembers && previousMembers.length > 0) {
        await supabase.from("season_memberships").insert(
          previousMembers.map((m) => ({
            season_id: season.id,
            user_id: m.user_id,
          })),
        );
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 ">
      <h2 className="text-base font-semibold text-ink">새 시즌 만들기</h2>

      <label className="flex flex-col gap-1">
        <span className="text-base text-ink-secondary">시작일</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => handleStartDateChange(e.target.value)}
          className="rounded-xl border border-border-strong px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-base text-ink-secondary">
          종료일 (4주 후 자동 계산, 수정 가능)
        </span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setNeedsOverlapConfirm(false);
          }}
          className="rounded-xl border border-border-strong px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </label>

      <SeasonFeeFields
        entryFee={entryFee}
        onEntryFeeChange={setEntryFee}
        refundPerCertification={refundPerCertification}
        onRefundPerCertificationChange={setRefundPerCertification}
      />

      {previousSeasonId && (
        <label className="flex items-center gap-2 text-base text-ink">
          <input
            type="checkbox"
            checked={copyPrevious}
            onChange={(e) => setCopyPrevious(e.target.checked)}
          />
          자동 연장 참여자 포함
        </label>
      )}

      {needsOverlapConfirm && (
        <p className="rounded-lg bg-warning-subtle px-3 py-2 text-base text-warning">
          기간이 겹치는 시즌이 있어요. 그래도 만들까요?
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting
          ? "생성 중..."
          : needsOverlapConfirm
            ? "그래도 만들기"
            : "시즌 만들기"}
      </button>
    </form>
  );
}
