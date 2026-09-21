"use client";

import { useEffect, useRef } from "react";

/**
 * Filled textarea matching the input style, plus the two things a plain
 * <textarea> doesn't do on its own: it grows with content instead of
 * scrolling internally, and (when `maxLength` is given) shows a "n/max"
 * counter under it.
 */
export function Textarea({
  value,
  onChange,
  maxLength,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <div className={className}>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        rows={1}
        className="w-full resize-none overflow-hidden rounded-xl border border-transparent bg-muted px-3 py-2.5 text-sm text-ink-strong placeholder:text-ink-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {maxLength && (
        <p className="mt-1 text-right text-sm text-ink-tertiary">
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
}
