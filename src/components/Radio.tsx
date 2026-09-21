"use client";

import type { ReactNode } from "react";

/**
 * A single radio option — a bordered circle with an inner dot that fades in
 * when selected. Callers manage the mutually-exclusive group themselves
 * (render one Radio per option, each checked against the shared selection
 * state); this component only renders one option's control + label.
 */
export function Radio({
  checked,
  onChange,
  disabled,
  children,
}: {
  checked: boolean;
  onChange: () => void;
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
        type="radio"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-[1.5px] peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 ${
          disabled
            ? "border-border-subtle bg-muted"
            : checked
              ? "border-primary bg-surface"
              : "border-border-strong bg-surface"
        }`}
      >
        <span
          className={`h-2.5 w-2.5 rounded-full bg-primary ${checked ? "opacity-100" : "opacity-0"}`}
        />
      </span>
      {children}
    </label>
  );
}
