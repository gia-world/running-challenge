"use client";

import { useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { BankForm } from "./BankForm";

export function BankInfoSheet({ userId }: { userId: string }) {
  // Deliberately no persisted dismissal — bank info is required for
  // settlement, so closing this only skips it for the current visit. The
  // parent only renders this component while bank info is actually missing,
  // so it comes right back on the next visit until it's filled in.
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  function close() {
    setIsOpen(false);
  }

  return (
    <BottomSheet onClose={close}>
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">계좌 정보 등록</h2>
          <p className="mt-1 text-base text-zinc-500 dark:text-zinc-400">
            참가비 정산(환급/상금)을 받으려면 계좌 등록이 필요해요.
          </p>
        </div>
        <BankForm userId={userId} initialBankName="" initialAccountNumber="" onSaved={close} />
        <button
          type="button"
          onClick={close}
          className="text-sm font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          나중에 할게요
        </button>
      </div>
    </BottomSheet>
  );
}
