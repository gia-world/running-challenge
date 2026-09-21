"use client";

import type { ReactNode } from "react";

/**
 * A native checkbox has no default look worth keeping, so this gives it the
 * app's own — a bordered square box that fills solid when checked. The
 * native input stays in the DOM (sr-only) so checking, keyboard focus, and
 * screen readers all work off the real control; the box + check icon are
 * purely visual.
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
      className={`inline-flex items-center gap-2 text-sm ${
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
        className={`flex h-5 w-5 flex-none items-center justify-center rounded-md border-[1.5px] peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 ${
          checked
            ? "border-primary bg-primary"
            : disabled
              ? "border-border-subtle bg-muted"
              : "border-border-strong bg-surface"
        }`}
      >
        <svg
          viewBox="0 0 13 13"
          className={`h-3 w-3 text-white ${checked ? "opacity-100" : "opacity-0"}`}
          fill="none"
        >
          <path
            d="M2.7 6.8L5.2 9.3L10.3 3.8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {children}
    </label>
  );
}
