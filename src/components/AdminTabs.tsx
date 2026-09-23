"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SegmentedTabs } from "./SegmentedTabs";

const TABS = [
  { href: "/admin/review", label: "재인증 요청함" },
  { href: "/admin/dropout", label: "중도하차 요청함" },
  { href: "/admin/members", label: "팀원 관리" },
  { href: "/admin/season", label: "시즌 관리" },
] as const;

export function AdminTabs({
  pendingCount = 0,
  dropoutPendingCount = 0,
  children,
}: {
  pendingCount?: number;
  dropoutPendingCount?: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const countByHref: Record<string, number> = {
    "/admin/review": pendingCount,
    "/admin/dropout": dropoutPendingCount,
  };

  return (
    <SegmentedTabs
      items={TABS.map((tab) => {
        const count = countByHref[tab.href] ?? 0;
        return {
          key: tab.href,
          href: tab.href,
          isActive: pathname === tab.href || pathname.startsWith(`${tab.href}/`),
          label: (
            <span className="inline-flex items-center gap-1">
              {tab.label}
              {count > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-sm font-bold text-white">
                  {count}
                </span>
              )}
            </span>
          ),
        };
      })}
    >
      {children}
    </SegmentedTabs>
  );
}
