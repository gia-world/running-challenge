"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Same look as BackLink, but for a page reachable from more than one place
 * (활동 상세 — 피드/홈/전체기록 어디서든 올 수 있음) where a single fixed
 * href would be wrong more often than not. Goes back in history instead.
 */
export function BackButton({ children }: { children: ReactNode }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="text-sm font-medium text-ink-tertiary hover:text-ink"
    >
      {children}
    </button>
  );
}
