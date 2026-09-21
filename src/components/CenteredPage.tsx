import type { ReactNode } from "react";

/** Shared wrapper for the standalone auth-flow screens (login/onboarding/join) and their loading states — centers content on a plain canvas, no header or bottom nav. */
export function CenteredPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-canvas px-6">
      {children}
    </div>
  );
}
