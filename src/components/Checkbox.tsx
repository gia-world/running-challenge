"use client";

import type { ReactNode } from "react";

/**
 * A native checkbox has no default look worth keeping, so this gives it the
 * app's own — a filled circle track inside a muted row, matching the
 * Wanted-reference checkbox/radio pattern. The native input stays in the
 * DOM (sr-only) so checking, keyboard focus, and screen readers all work
 * off the real control; the circle + check icon are purely visual.
 */
export function Checkbox({
  checked,
  onChange,
  disabled,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      className={`flex items-center gap-2 rounded-lg bg-muted p-3 text-base ${
        disabled ? "text-ink-disabled" : "cursor-pointer text-ink"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 ${
          checked
            ? "border-primary bg-primary"
            : disabled
              ? "border-border bg-muted-strong"
              : "border-border-strong"
        }`}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none">
            <path
              d="M2.5 6.5L5 9L9.5 3.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      {children}
    </label>
  );
}
