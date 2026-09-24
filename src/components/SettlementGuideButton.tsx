"use client";

import { useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { SectionTitle } from "./SectionTitle";

type GuideItem = { emoji: string; title: string; body: string };

const SETTLEMENT_GUIDE: GuideItem[] = [
  {
    emoji: "💰",
    title: "환급",
    body: "인증 1회당 정해진 금액을 환급받아요. 한 주에 3회 넘게 인증해도 그 주는 3회까지만 환급돼요.",
  },
  {
    emoji: "🎉",
    title: "시즌 성공(완주)",
    body: "매주 목표 횟수(3회)를 채우면 그 주는 성공이에요. 시즌의 모든 주를 성공하면 완주예요.",
  },
  {
    emoji: "🏆",
    title: "상금",
    body: "완주하지 못한 사람들이 다 돌려받지 못한 참가비를 모아 완주한 사람들에게 똑같이 나눠요. 완주자가 없으면 상금도 없어요.",
  },
  {
    emoji: "🔁",
    title: "다음 시즌 연장",
    body: "연장을 신청하면 환급액이 현금 대신 다음 시즌 참가비로 이월돼요. 목표를 채우지 못해 생기는 벌금은 이월되지 않아서 따로 입금해야 해요.",
  },
  {
    emoji: "🚪",
    title: "중도하차",
    body: "사정이 생겨 중간에 그만두면 정산 금액은 관리자가 직접 정해요.",
  },
];

/**
 * "정산 결과" 옆의 "?" 정보 버튼 — StatusBoard의 "시즌 성공 뱃지" 기준
 * 안내와 같은 패턴(제목 옆 원형 "?" 버튼 → 바텀시트로 항목별 설명).
 */
export function SettlementGuideButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="정산 가이드 보기"
        className="flex h-4 w-4 items-center justify-center rounded-full border text-sm border-ink-secondary text-ink-secondary"
      >
        ?
      </button>

      {isOpen && (
        <BottomSheet onClose={() => setIsOpen(false)}>
          <div className="flex flex-col gap-3">
            <SectionTitle size="lg">정산 가이드</SectionTitle>
            <ul className="flex flex-col gap-3">
              {SETTLEMENT_GUIDE.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span className="text-2xl">{item.emoji}</span>
                  <div className="flex flex-col">
                    <span className="font-semibold text-ink-strong">{item.title}</span>
                    <span className="text-sm text-ink-secondary">{item.body}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </BottomSheet>
      )}
    </>
  );
}
