"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Toggle } from "@/components/Toggle";

/**
 * "다음 시즌 자동 생성" — 참여자 개인의 "계속 참여"(AutoRenewPreferenceToggle)와
 * 같은 발상을 관리자의 시즌 운영에 적용한 것. 켜두면 시즌이 자동으로
 * 정산될 때(autoSettle.ts) 바로 다음 날부터 같은 기간/참가비로 새 시즌을
 * 만들고, 자동연장한 참여자도 그대로 옮겨준다. 끄면 지금까지처럼 이
 * 페이지에서 "새 시즌 만들기"로 직접 만들어야 한다.
 */
export function AutoCreateSeasonToggle({
  teamId,
  initialChecked,
}: {
  teamId: string;
  initialChecked: boolean;
}) {
  const [checked, setChecked] = useState(initialChecked);
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(value: boolean) {
    setChecked(value);
    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("teams")
      .update({ auto_create_next_season: value })
      .eq("id", teamId);
    if (error) {
      console.error("[admin/season] auto-create-season preference update failed:", error.message);
      setChecked(!value);
    }
    setIsSaving(false);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
      <Toggle checked={checked} onChange={handleChange} disabled={isSaving}>
        다음 시즌 자동 생성
      </Toggle>
      <p className="mt-1 text-sm text-ink-tertiary">
        켜두면 시즌이 끝나는 즉시 같은 기간/참가비로 다음 시즌이 자동으로 만들어지고, 자동연장한
        참여자도 그대로 옮겨져요. 끄면 지금처럼 여기서 직접 만들어야 해요.
      </p>
    </div>
  );
}
