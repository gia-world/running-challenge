import type { ReactNode } from "react";

export function ErrorBanner({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`rounded-lg bg-danger-subtle px-3 py-2 text-sm text-danger ${className}`}
    >
      {children}
    </p>
  );
}
