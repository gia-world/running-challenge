import type { ReactNode } from "react";
import { PageHeader } from "./PageHeader";
import { BottomNav, type ActiveTab } from "./BottomNav";
import { HeadingLevelBoundary } from "./HeadingLevel";

/**
 * The header + main + bottom-nav frame every top-level page (and its
 * loading.tsx) repeats. `header` is whatever goes inside PageHeader's
 * children slot — usually a <PageTitle>, or a skeleton placeholder on
 * loading screens. Both the header's hamburger menu and the bottom nav
 * always render, on every page — `activeTab` just says which of the 4
 * bottom-nav icons (홈/인증하기/피드/현황판) to highlight; pages that aren't
 * one of those 4 (마이페이지, 시즌 전체 기록, 관리자) simply omit it, so the
 * bottom nav still shows for quick access elsewhere, just with nothing lit
 * up. That constant presence is also why those pages no longer need a
 * `<BackLink>` back to home — the bottom nav's 홈 icon already does that
 * from anywhere.
 *
 * Also anchors the app's heading chain: a hidden h1 (there's no visible
 * wordmark on any screen), h2 is PageHeader's team name, h3 is `header`
 * (usually a <PageTitle>) — then main's content starts at h4, so a
 * <SectionTitle> lands on h4 normally or h5 automatically when a
 * SegmentedTabs wraps it.
 */
export function PageShell({
  teamName,
  eyebrowSkeleton,
  suffix,
  isAdmin,
  header,
  mainClassName = "mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-6",
  activeTab,
  children,
}: {
  teamName?: string | null;
  eyebrowSkeleton?: boolean;
  suffix?: string;
  /** Whether the header's hamburger menu shows the 관리자 item. */
  isAdmin?: boolean;
  header: ReactNode;
  mainClassName?: string;
  /** Which bottom-nav icon to highlight — omit on pages that aren't one of the 4 (마이페이지/시즌 전체 기록/관리자); the nav still shows, just with nothing active. */
  activeTab?: ActiveTab;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col bg-canvas pb-20">
      <h1 className="sr-only">러닝 인증 챌린지</h1>

      <PageHeader
        teamName={teamName}
        eyebrowSkeleton={eyebrowSkeleton}
        suffix={suffix}
        isAdmin={isAdmin}
      >
        {header}
      </PageHeader>

      <main className={mainClassName}>
        <HeadingLevelBoundary level={4}>{children}</HeadingLevelBoundary>
      </main>

      <BottomNav active={activeTab} />
    </div>
  );
}
