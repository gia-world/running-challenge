"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type SegmentedTabItem = {
  key: string;
  label: ReactNode;
  isActive: boolean;
  href?: string;
  onClick?: () => void;
};

/**
 * Track + pill pattern for switching between mutually-exclusive views —
 * either in place (onClick, e.g. StatusBoard's 이번 시즌/전체 기록) or via
 * navigation (href, e.g. admin's sub-pages, certify's season picker). Same
 * visual treatment either way: the active item is a white pill with a
 * shadow inside a muted track.
 */
export function SegmentedTabs({ items }: { items: SegmentedTabItem[] }) {
  return (
    <div className="flex gap-1 rounded-xl bg-muted p-1 text-sm">
      {items.map((item) => {
        const className = item.isActive
          ? "flex-1 whitespace-nowrap rounded-lg bg-surface py-2 text-center font-semibold text-ink-strong shadow-sm"
          : "flex-1 whitespace-nowrap rounded-lg py-2 text-center font-medium text-ink-secondary";

        if (item.href) {
          return (
            <Link key={item.key} href={item.href} className={className}>
              {item.label}
            </Link>
          );
        }

        return (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            className={className}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
