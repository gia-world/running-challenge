"use client";

import { useSyncExternalStore } from "react";
import { BottomSheet } from "./BottomSheet";
import { BankForm } from "./BankForm";

const DISMISS_KEY_PREFIX = "bank-info-sheet-dismissed:";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isDismissed(userId: string) {
  try {
    return localStorage.getItem(DISMISS_KEY_PREFIX + userId) === "1";
  } catch {
    return false;
  }
}

export function BankInfoSheet({ userId }: { userId: string }) {
  // Dismissal lives in localStorage, which the server can't see — assume
  // dismissed for the server/hydration snapshot so nothing flashes open,
  // then useSyncExternalStore re-checks on the client right after mount.
  const dismissed = useSyncExternalStore(
    subscribe,
    () => isDismissed(userId),
    () => true,
  );

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY_PREFIX + userId, "1");
    } catch {
      // Nothing to persist to — the sheet will just show again next visit.
    }
    for (const listener of listeners) listener();
  }

  if (dismissed) return null;

  return (
    <BottomSheet onClose={dismiss}>
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">계좌 정보 등록</h2>
          <p className="mt-1 text-base text-zinc-500 dark:text-zinc-400">
            환급/상금을 받을 계좌를 등록해두면 담당자가 이체할 때 따로
            물어보지 않아도 돼요.
          </p>
        </div>
        <BankForm userId={userId} initialBankName="" initialAccountNumber="" onSaved={dismiss} />
        <button
          type="button"
          onClick={dismiss}
          className="text-sm font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          나중에 할게요
        </button>
      </div>
    </BottomSheet>
  );
}
