"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Heading } from "./Heading";
import { HeadingLevelBoundary } from "./HeadingLevel";

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
 *
 * Pass the panel content this tab governs as `children` (not a sibling) —
 * that's what lets the heading chain work out on its own: a hidden
 * heading announces the active tab's label at whatever level is ambient,
 * and everything in `children` automatically steps one level deeper, so a
 * <SectionTitle> inside lands on the right tag without anyone passing a
 * number. Tabs with no children-shaped content (e.g. admin's sub-page
 * nav, where the panel is a sibling route) just omit it.
 */
export function SegmentedTabs({
  items,
  children,
}: {
  items: SegmentedTabItem[];
  children?: ReactNode;
}) {
  const activeItem = items.find((item) => item.isActive);

  return (
    <>
      {activeItem && <Heading srOnly>{activeItem.label}</Heading>}

      <div className="flex gap-1 rounded-xl bg-muted-strong p-1 text-sm">
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

      {children &&
        (activeItem ? (
          // Only step children a level deeper when an active tab actually
          // emitted the heading that level jump depends on — otherwise
          // (no item currently matches isActive) render them as-is, so the
          // chain never skips a level with nothing to justify it.
          <HeadingLevelBoundary>{children}</HeadingLevelBoundary>
        ) : (
          children
        ))}
    </>
  );
}
