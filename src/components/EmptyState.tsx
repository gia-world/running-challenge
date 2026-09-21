import type { ReactNode } from "react";

export function EmptyState({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border-2 border-dashed border-border-strong p-6 text-center text-base text-ink-secondary ${className}`}
    >
      {children}
    </section>
  );
}
