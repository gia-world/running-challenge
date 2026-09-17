import type { ReactNode } from "react";
import { TeamEyebrow } from "./TeamEyebrow";

export function PageHeader({
  teamName,
  suffix,
  action,
  children,
}: {
  teamName?: string | null;
  suffix?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
      <div>
        <TeamEyebrow teamName={teamName} suffix={suffix} />
        {children}
      </div>
      {action}
    </header>
  );
}
