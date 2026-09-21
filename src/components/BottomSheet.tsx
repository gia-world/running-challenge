"use client";

import type { ReactNode } from "react";

export function BottomSheet({
  onClose,
  children,
}: {
  onClose?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="animate-sheet-up rounded-t-2xl bg-surface p-5 pb-8 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
