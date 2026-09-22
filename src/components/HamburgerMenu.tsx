"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// TODO: 실제 카톡 수다방 링크로 교체.
const CHAT_URL = "#";

const ROW_CLASS = "rounded-xl px-3 py-2.5 text-left text-base font-medium hover:bg-muted";
const SUB_ROW_CLASS = "rounded-xl py-2.5 pl-6 pr-3 text-left text-base font-medium hover:bg-muted";
const GROUP_LABEL_CLASS = "px-3 pt-3 pb-1 text-sm font-semibold text-ink-tertiary";

const ADMIN_ITEMS = [
  { href: "/admin/review", label: "재인증 요청함" },
  { href: "/admin/members", label: "팀원 관리" },
  { href: "/admin/season", label: "시즌 관리" },
] as const;

const MY_CERTIFICATIONS_ITEMS = [
  { href: "/history?scope=week", label: "이번주 인증 기록" },
  { href: "/history", label: "시즌 전체 기록" },
] as const;

/**
 * Global nav menu, always available from the header (not just on screens
 * with a bottom nav) — holds the "occasional destination" screens that used
 * to be reached one at a time (관리자's own bottom-nav tab, 설정/my 인증
 * tucked behind a BackLink on home) plus 로그아웃, which had no good home
 * of its own. The bottom nav stays reserved for the 4 screens a crew
 * member taps into daily. 관리자/my 인증 are depth-1 group labels (not
 * links themselves) with their real destinations listed as indented
 * depth-2 items right below.
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
            className="animate-drawer-in flex h-full w-64 flex-col gap-1 overflow-y-auto rounded-l-2xl bg-surface p-4 shadow-lg"
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

            <a
              href={CHAT_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className={`${ROW_CLASS} text-ink`}
            >
              챌린지 수다방
            </a>

            {isAdmin && (
              <>
                <p className={GROUP_LABEL_CLASS}>관리자</p>
                {ADMIN_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`${SUB_ROW_CLASS} text-ink`}
                  >
                    {item.label}
                  </Link>
                ))}
              </>
            )}

            <Link
              href="/mypage"
              onClick={() => setIsOpen(false)}
              className={`${ROW_CLASS} text-ink`}
            >
              설정
            </Link>

            <p className={GROUP_LABEL_CLASS}>my 인증</p>
            {MY_CERTIFICATIONS_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`${SUB_ROW_CLASS} text-ink`}
              >
                {item.label}
              </Link>
            ))}

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
