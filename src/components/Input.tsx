"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

const BASE =
  "rounded-xl border border-transparent bg-muted text-ink-strong placeholder:text-ink-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60";

/**
 * The filled text input every form field in the app uses. `className` is
 * where each field's own padding/text-size/alignment go (they vary field to
 * field) — BASE only carries what's always true (radius, filled background,
 * focus ring, disabled state), so a per-field className never has to fight
 * it over the same property.
 */
export function Input({
  label,
  labelClassName = "text-base text-ink-secondary",
  className,
  ...props
}: {
  label?: ReactNode;
  labelClassName?: string;
  className?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const input = <input {...props} className={className ? `${BASE} ${className}` : BASE} />;

  if (!label) return input;

  return (
    <label className="flex flex-col gap-1">
      <span className={labelClassName}>{label}</span>
      {input}
    </label>
  );
}
