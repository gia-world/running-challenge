"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "inverse" | "danger";
type Size = "full" | "auto" | "pill";

const VARIANT: Record<Variant, string> = {
  primary: "bg-primary font-semibold text-white",
  secondary: "bg-muted-strong font-medium text-ink",
  inverse: "bg-inverse font-semibold text-white",
  danger: "bg-danger font-semibold text-white",
};

// 폼 맨 아래 꽉 차는 제출 버튼(full, py-3.5) > 단독/2단 나열 액션(auto,
// py-3) > 카드 안 인라인 액션(pill, py-2, shrink-0) 순으로 무게가 줄어드는
// 3단 크기 체계 — DESIGN.md "버튼" 참고. 두 개를 나란히 두는 화면(선택
// 질문, 반려 확인 등)은 auto/pill에 className="flex-1"을 얹어서 쓴다.
const SIZE: Record<Size, string> = {
  full: "w-full px-5 py-3.5",
  auto: "px-5 py-3",
  pill: "shrink-0 px-3 py-2",
};

/**
 * 앱의 모든 채워진(filled) 버튼이 쓰는 공통 컴포넌트. 텍스트만 있는
 * 토글/링크형 버튼(로그아웃, 정렬 전환 등)은 색 로직이 화면마다 달라서
 * 대상이 아니다 — 카카오 로그인 버튼과 리액션 피커도 각자 고유한
 * 스타일이라 예외.
 */
export function Button({
  variant = "primary",
  size = "full",
  className = "",
  children,
  ...props
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-xl disabled:opacity-60 ${VARIANT[variant]} ${SIZE[size]}${className ? ` ${className}` : ""}`}
    >
      {children}
    </button>
  );
}
