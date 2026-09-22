import type { ReactNode } from "react";
import { PageHeader } from "./PageHeader";
import { BottomNav, type ActiveTab } from "./BottomNav";
import { HeadingLevelBoundary } from "./HeadingLevel";

/**
 * The header + main + bottom-nav frame every top-level page (and its
 * loading.tsx) repeats. `header` is whatever goes inside PageHeader's
 * children slot — usually a <PageTitle>, sometimes a <BackLink> + title,
 * or a skeleton placeholder on loading screens. The header's hamburger
 * menu (관리자/마이페이지/시즌 전체 기록/로그아웃) always renders regardless
 * of `bottomNav` — the bottom nav itself is reserved for the 4 screens a
 * crew member taps into daily (홈/인증하기/피드/현황판), so "occasional
 * destination" pages (마이페이지, 시즌 전체 기록, 관리자) all omit `bottomNav`
 * and rely on the hamburger (plus a `<BackLink>` in `header`) instead.
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
  bottomNav,
  children,
}: {
  teamName?: string | null;
  eyebrowSkeleton?: boolean;
  suffix?: string;
  /** Whether the header's hamburger menu shows the 관리자 item. */
  isAdmin?: boolean;
  header: ReactNode;
  mainClassName?: string;
  bottomNav?: { active: ActiveTab };
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-1 flex-col bg-canvas${bottomNav ? " pb-20" : ""}`}>
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

      {bottomNav && <BottomNav active={bottomNav.active} />}
    </div>
  );
}
