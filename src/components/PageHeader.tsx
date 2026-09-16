import type { ReactNode } from "react";
import { CrewEyebrow } from "./CrewEyebrow";

export function PageHeader({
  suffix,
  action,
  children,
}: {
  suffix?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
      <div>
        <CrewEyebrow suffix={suffix} />
        {children}
      </div>
      {action}
    </header>
  );
}
