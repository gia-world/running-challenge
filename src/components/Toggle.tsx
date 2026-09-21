"use client";

import type { ReactNode } from "react";

/**
 * An on/off switch — track + sliding knob. Distinct from Checkbox: this is
 * for a setting that takes effect immediately (no separate submit), not a
 * form field. Uses `role="switch"` on the native input for correct
 * assistive-tech semantics.
 */
export function Toggle({
  checked,
  onChange,
  disabled,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <label
      className={`inline-flex items-center gap-2.5 text-sm ${
        disabled ? "text-ink-disabled" : "cursor-pointer text-ink"
      }`}
    >
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`relative inline-flex h-[26px] w-11 flex-none items-center rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 ${
          checked ? "bg-primary" : "bg-border-strong"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <span
          className={`absolute left-[3px] h-5 w-5 rounded-full bg-surface shadow-sm transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-0"
          }`}
        />
      </span>
      {children}
    </label>
  );
}
