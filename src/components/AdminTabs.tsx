"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/review", label: "재인증 요청함" },
  { href: "/admin/members", label: "팀원 관리" },
  { href: "/admin/season", label: "시즌 관리" },
] as const;

export function AdminTabs({ pendingCount = 0 }: { pendingCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="mt-2 flex gap-4 overflow-x-auto whitespace-nowrap">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              isActive
                ? "flex items-center gap-1 text-base font-bold text-zinc-900 dark:text-zinc-50"
                : "flex items-center gap-1 text-base font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }
          >
            {tab.label}
            {tab.href === "/admin/review" && pendingCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
