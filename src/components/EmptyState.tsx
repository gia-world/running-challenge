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
      className={`rounded-2xl border-2 border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400 ${className}`}
    >
      {children}
    </section>
  );
}
