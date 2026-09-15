import Link from "next/link";

type ActiveTab = "home" | "feed" | "certify" | "admin";

const ITEMS = [
  { key: "home", href: "/home", label: "홈", icon: "🏠" },
  { key: "feed", href: "/feed", label: "피드", icon: "📷" },
  { key: "certify", href: "/certify", label: "인증", icon: "➕" },
  { key: "admin", href: "/admin/review", label: "관리자", icon: "🛠️" },
] as const satisfies { key: ActiveTab; href: string; label: string; icon: string }[];

export function BottomNav({ active, isAdmin = false }: { active: ActiveTab; isAdmin?: boolean }) {
  const items = ITEMS.filter((item) => item.key !== "admin" || isAdmin);

  return (
    <nav className="fixed inset-x-0 bottom-0 flex border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-zinc-800 dark:bg-zinc-950">
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={
              isActive
                ? "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium text-orange-500"
                : "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium text-zinc-400"
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
