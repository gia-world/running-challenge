"use client";

import type { ReactNode } from "react";
import { useHeadingLevel } from "./HeadingLevel";

const TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

/** Renders at whatever level HeadingLevelBoundary currently has ambient — the primitive SectionTitle and SegmentedTabs' hidden active-tab heading are built on. */
export function Heading({
  className,
  srOnly,
  children,
}: {
  className?: string;
  srOnly?: boolean;
  children: ReactNode;
}) {
  const level = useHeadingLevel();
  const Tag = TAGS[Math.min(Math.max(level, 1), 6) - 1];
  const finalClassName = srOnly
    ? ["sr-only", className].filter(Boolean).join(" ")
    : className;
  return <Tag className={finalClassName}>{children}</Tag>;
}
