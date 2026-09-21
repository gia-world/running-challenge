"use client";

import { createContext, useContext, type ReactNode } from "react";

const HeadingLevelContext = createContext(1);

export function useHeadingLevel(): number {
  return useContext(HeadingLevelContext);
}

/**
 * Declares the heading level for everything rendered inside. Pass `level`
 * to jump to an exact level (PageShell setting the page body to 4, right
 * after the fixed h1/h2/h3 preamble); omit it to just step one level
 * deeper than whatever's ambient (SegmentedTabs nesting its panel content
 * one level under its own hidden active-tab heading) — that's what makes
 * a <SectionTitle> automatically land on h4 or h5 depending on whether a
 * tab wraps it, with no page having to say which.
 */
export function HeadingLevelBoundary({
  level,
  children,
}: {
  level?: number;
  children: ReactNode;
}) {
  const ambient = useHeadingLevel();
  const next = level ?? Math.min(ambient + 1, 6);
  return (
    <HeadingLevelContext.Provider value={next}>{children}</HeadingLevelContext.Provider>
  );
}
