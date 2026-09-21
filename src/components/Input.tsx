"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

const BASE =
  "rounded-xl border border-transparent bg-muted px-3 py-2.5 text-sm text-ink-strong placeholder:text-ink-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60";

/**
 * The filled text input every form field in the app uses. Every field ends
 * up with the same padding/text size, so that's baked into BASE — the only
 * thing that actually varies is alignment (the two standalone "hero"
 * fields, JoinForm's invite code and OnboardingForm's name, are centered;
 * everything else is left), so `className` is just for that.
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
