"use client";

import { usePathname } from "next/navigation";
import { SegmentedTabs } from "./SegmentedTabs";

const TABS = [
  { href: "/admin/review", label: "재인증 요청함" },
  { href: "/admin/members", label: "팀원 관리" },
  { href: "/admin/season", label: "시즌 관리" },
] as const;

export function AdminTabs({ pendingCount = 0 }: { pendingCount?: number }) {
  const pathname = usePathname();

  return (
    <SegmentedTabs
      items={TABS.map((tab) => ({
        key: tab.href,
        href: tab.href,
        isActive: pathname === tab.href || pathname.startsWith(`${tab.href}/`),
        label: (
          <span className="inline-flex items-center gap-1">
            {tab.label}
            {tab.href === "/admin/review" && pendingCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-sm font-bold text-white">
                {pendingCount}
              </span>
            )}
          </span>
        ),
      }))}
    />
  );
}
