"use client";

import type { ReactNode } from "react";
import { Heading } from "./Heading";

/**
 * The section heading every list/table/section inside a page uses. Its
 * actual tag (h4 under a plain page, h5 under a page with a SegmentedTabs
 * above it) comes from HeadingLevelBoundary automatically — never pass a
 * level by hand. "base" is the common case; "lg" is for a section that
 * reads more like its own sub-page (마이페이지's "자동 연장"/"계좌 정보").
 */
export function SectionTitle({
  size = "base",
  className,
  children,
}: {
  size?: "base" | "lg";
  className?: string;
  children: ReactNode;
}) {
  const base =
    size === "lg"
      ? "text-lg font-bold text-ink-strong"
      : "text-base font-semibold text-ink";
  return <Heading className={className ? `${base} ${className}` : base}>{children}</Heading>;
}
