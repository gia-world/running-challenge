import type { ReactNode } from "react";
import { TeamEyebrow } from "./TeamEyebrow";

export function PageHeader({
  teamName,
  eyebrowSkeleton = false,
  suffix,
  action,
  children,
}: {
  teamName?: string | null;
  /**
   * loading.tsx renders before any data fetch, so it has no real teamName
   * to pass — showing TeamEyebrow's default-name fallback there just
   * flashes the wrong name for a moment once the real page loads. Use this
   * instead to show a neutral placeholder there.
   */
  eyebrowSkeleton?: boolean;
  suffix?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <div>
        {eyebrowSkeleton ? (
          <div className="h-3.5 w-24 animate-pulse rounded bg-muted-strong" />
        ) : (
          <TeamEyebrow teamName={teamName} suffix={suffix} />
        )}
        {children}
      </div>
      {action}
    </header>
  );
}
