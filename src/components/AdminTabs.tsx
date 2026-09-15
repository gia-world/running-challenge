"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/review", label: "심사 대기" },
  { href: "/admin/members", label: "크루원 관리" },
] as const;

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav className="mt-2 flex gap-4">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={
            pathname === tab.href
              ? "text-lg font-bold text-zinc-900 dark:text-zinc-50"
              : "text-lg font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
