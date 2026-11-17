"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Toggle } from "@/components/Toggle";

/**
 * "매 시즌 물어보지 않고 계속 참여" 스탠딩 설정 — RenewalToggle(시즌마다
 * 한 번씩 묻는 "다음 시즌도 계속하시나요?")과 용어를 다르게 가져갔다.
 * 이건 끄기 전까지 모든 시즌에 반복 적용되는 설정이고, RenewalToggle은
 * 그 시즌 한 번만 적용되는 선택이라 — 같은 "자동 연장" 표현을 쓰면
 * 둘이 헷갈린다.
 */
export function AutoRenewPreferenceToggle({
  userId,
  initialChecked,
}: {
  userId: string;
  initialChecked: boolean;
}) {
  const [checked, setChecked] = useState(initialChecked);
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(value: boolean) {
    setChecked(value);
    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ auto_renew_preference: value })
      .eq("id", userId);
    if (error) {
      console.error("[mypage] auto-renew preference update failed:", error.message);
      setChecked(!value);
    }
    setIsSaving(false);
  }

  return (
    <Toggle checked={checked} onChange={handleChange} disabled={isSaving}>
      매 시즌 물어보지 않고 계속 참여
    </Toggle>
  );
}
