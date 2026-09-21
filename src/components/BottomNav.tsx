import Link from "next/link";

type ActiveTab = "home" | "feed" | "certify" | "status" | "admin";

const ITEMS = [
  { key: "home", href: "/home", label: "홈", icon: "🏠" },
  { key: "feed", href: "/feed", label: "피드", icon: "📷" },
  { key: "certify", href: "/certify", label: "인증", icon: "➕" },
  { key: "status", href: "/status", label: "현황판", icon: "📊" },
  { key: "admin", href: "/admin/review", label: "관리자", icon: "🛠️" },
] as const satisfies { key: ActiveTab; href: string; label: string; icon: string }[];

export function BottomNav({ active, isAdmin = false }: { active: ActiveTab; isAdmin?: boolean }) {
  const items = ITEMS.filter((item) => item.key !== "admin" || isAdmin);

  return (
    <nav className="fixed inset-x-0 bottom-0 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
      {items.map((item) => {
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
