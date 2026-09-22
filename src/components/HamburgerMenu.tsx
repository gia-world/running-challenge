"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ROW_CLASS = "rounded-xl px-3 py-2.5 text-left text-base font-medium hover:bg-muted";

/**
 * Global nav menu, always available from the header (not just on screens
 * with a bottom nav) — holds the "occasional destination" screens that used
 * to be reached one at a time (관리자's own bottom-nav tab, 마이페이지/시즌
 * 전체 기록 tucked behind a BackLink on home) plus 로그아웃, which had no
 * good home of its own. The bottom nav stays reserved for the 4 screens a
 * crew member taps into daily.
 */
export function HamburgerMenu({ isAdmin = false }: { isAdmin?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="메뉴 열기"
        className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-ink hover:bg-muted"
      >
        ☰
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="animate-drawer-in flex h-full w-64 flex-col gap-1 rounded-l-2xl bg-surface p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-base font-semibold text-ink-strong">메뉴</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="닫기"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-lg text-ink"
              >
                ✕
              </button>
            </div>

            {isAdmin && (
              <Link
                href="/admin/review"
                onClick={() => setIsOpen(false)}
                className={`${ROW_CLASS} text-ink`}
              >
                관리자
              </Link>
            )}
            <Link
              href="/mypage"
              onClick={() => setIsOpen(false)}
              className={`${ROW_CLASS} text-ink`}
            >
              마이페이지
            </Link>
            <Link
              href="/history"
              onClick={() => setIsOpen(false)}
              className={`${ROW_CLASS} text-ink`}
            >
              시즌 전체 기록
            </Link>

            <div className="mt-auto border-t border-border-subtle pt-2">
              <button
                type="button"
                onClick={handleSignOut}
                className={`w-full ${ROW_CLASS} text-ink-secondary`}
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
