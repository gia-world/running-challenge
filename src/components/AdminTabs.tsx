"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SegmentedTabs } from "./SegmentedTabs";

const TABS = [
  { href: "/admin/review", label: "요청함" },
  { href: "/admin/members", label: "팀원 관리" },
  { href: "/admin/season", label: "시즌 관리" },
  { href: "/admin/announcements", label: "공지사항" },
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
  // 재인증 요청/중도하차 요청이 "요청함" 탭 하나로 합쳐져 있어서, 뱃지도
  // 어느 쪽이든 대기 중인 게 있으면 보이도록 합산한다.
  const countByHref: Record<string, number> = {
    "/admin/review": pendingCount + dropoutPendingCount,
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
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-sm font-semibold text-white">
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
