import Link from "next/link";

const ITEMS = [
  { href: "/home", label: "홈", icon: "🏠" },
  { href: "/feed", label: "피드", icon: "📷" },
  { href: "/certify", label: "인증", icon: "➕" },
] as const;

type ActiveTab = "home" | "feed" | "certify";

export function BottomNav({ active }: { active: ActiveTab }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 flex border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-zinc-800 dark:bg-zinc-950">
      {ITEMS.map((item) => {
        const isActive = item.href === `/${active}`;
        return (
          <Link
            key={item.href}
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
