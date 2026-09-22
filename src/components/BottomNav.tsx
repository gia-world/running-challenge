import Link from "next/link";

export type ActiveTab = "home" | "feed" | "certify" | "status";

const ITEMS = [
  { key: "home", href: "/home", label: "홈", icon: "🏠" },
  { key: "feed", href: "/feed", label: "피드", icon: "📷" },
  { key: "certify", href: "/certify", label: "인증", icon: "➕" },
  { key: "status", href: "/status", label: "현황판", icon: "📊" },
] as const satisfies { key: ActiveTab; href: string; label: string; icon: string }[];

/**
 * Always visible, on every page — always shows the same 4 daily-habit
 * screens (everything else, 관리자/마이페이지/시즌 전체 기록/로그아웃, lives
 * in the header's hamburger menu instead). `active` is omitted on pages
 * that aren't one of the 4 (마이페이지, 시즌 전체 기록, 관리자) — the nav
 * still renders, just with nothing highlighted, since none of the icons
 * actually represents where you are.
 */
export function BottomNav({ active }: { active?: ActiveTab }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
      {ITEMS.map((item) => {
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={
              isActive
                ? "flex flex-1 flex-col items-center gap-1 py-3 text-sm font-medium text-primary"
                : "flex flex-1 flex-col items-center gap-1 py-3 text-sm font-medium text-ink-tertiary"
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
