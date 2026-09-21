import type { ReactNode } from "react";

/**
 * The h2 every section inside a page uses. "base" is the common case
 * (a list/table/section label); "lg" is for a section that reads more
 * like its own sub-page (마이페이지's "자동 연장"/"계좌 정보").
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
  return <h2 className={className ? `${base} ${className}` : base}>{children}</h2>;
}
