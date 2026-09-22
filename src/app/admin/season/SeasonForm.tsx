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
import { SectionTitle } from "@/components/SectionTitle";
import { Checkbox } from "@/components/Checkbox";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <SectionTitle>새 시즌 만들기</SectionTitle>

      <Input
        type="date"
        label="시작일"
        value={startDate}
        onChange={(e) => handleStartDateChange(e.target.value)}
      />

      <Input
        type="date"
        label="종료일 (4주 후 자동 계산, 수정 가능)"
        value={endDate}
        onChange={(e) => {
          setEndDate(e.target.value);
          setNeedsOverlapConfirm(false);
        }}
      />

      <SeasonFeeFields
        entryFee={entryFee}
        onEntryFeeChange={setEntryFee}
        refundPerCertification={refundPerCertification}
        onRefundPerCertificationChange={setRefundPerCertification}
      />

      {previousSeasonId && (
        <Checkbox checked={copyPrevious} onChange={setCopyPrevious}>
          자동 연장 참여자 포함
        </Checkbox>
      )}

      {needsOverlapConfirm && (
        <p className="rounded-lg bg-warning-subtle px-3 py-2 text-base text-warning">
          기간이 겹치는 시즌이 있어요. 그래도 만들까요?
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? "생성 중..."
          : needsOverlapConfirm
            ? "그래도 만들기"
            : "시즌 만들기"}
      </Button>
    </form>
  );
}
