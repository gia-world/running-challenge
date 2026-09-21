import type { ReactNode } from "react";
import { PageHeader } from "./PageHeader";
import { BottomNav, type ActiveTab } from "./BottomNav";

/**
 * The header + main + bottom-nav frame every top-level page (and its
 * loading.tsx) repeats. `header` is whatever goes inside PageHeader's
 * children slot — usually a <PageTitle>, sometimes a <BackLink> + title,
 * or a skeleton placeholder on loading screens. Pages without a bottom
 * nav (마이페이지) just omit `bottomNav`.
 */
export function PageShell({
  teamName,
  eyebrowSkeleton,
  suffix,
  headerAction,
  header,
  mainClassName = "mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-6",
  bottomNav,
  children,
}: {
  teamName?: string | null;
  eyebrowSkeleton?: boolean;
  suffix?: string;
  headerAction?: ReactNode;
  header: ReactNode;
  mainClassName?: string;
  bottomNav?: { active: ActiveTab; isAdmin?: boolean };
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-1 flex-col bg-canvas${bottomNav ? " pb-20" : ""}`}>
      <PageHeader
        teamName={teamName}
        eyebrowSkeleton={eyebrowSkeleton}
        suffix={suffix}
        action={headerAction}
      >
        {header}
      </PageHeader>

      <main className={mainClassName}>{children}</main>

      {bottomNav && <BottomNav active={bottomNav.active} isAdmin={bottomNav.isAdmin} />}
    </div>
  );
}
