import Link from "next/link";
import type { ReactNode } from "react";

/** The small "← 홈" / "← 시즌 관리" link every page header/back-nav repeats. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-medium text-ink-tertiary hover:text-ink">
      {children}
    </Link>
  );
}
