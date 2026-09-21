import type { ReactNode } from "react";

/**
 * The h1 every screen uses. "default" is the in-app size (page header,
 * next to the team eyebrow); "lg" is for the standalone centered auth
 * screens (login/onboarding/join) that need more visual weight.
 */
export function PageTitle({
  size = "default",
  className,
  children,
}: {
  size?: "default" | "lg";
  className?: string;
  children: ReactNode;
}) {
  const base =
    size === "lg"
      ? "text-2xl font-bold text-ink-strong"
      : "text-lg font-bold text-ink-strong";
  return <h1 className={className ? `${base} ${className}` : base}>{children}</h1>;
}
