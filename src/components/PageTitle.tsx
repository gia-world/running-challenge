import type { ReactNode } from "react";

/**
 * The page title every screen uses. "default" is the in-app size — the
 * current menu/page name inside PageShell, which renders as h3: h1 is the
 * hidden app name PageShell provides once, h2 is the team name in
 * PageHeader, and this is the third fixed rung. "lg" is for the standalone
 * centered auth screens (login/onboarding/join), which have no team/menu
 * chain above them — there, this component IS the page's real h1.
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
  const finalClassName = className ? `${base} ${className}` : base;
  return size === "lg" ? (
    <h1 className={finalClassName}>{children}</h1>
  ) : (
    <h3 className={finalClassName}>{children}</h3>
  );
}
