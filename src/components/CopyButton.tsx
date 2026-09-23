"use client";

import { useState } from "react";
import { Button } from "./Button";

/**
 * Copies `value` to the clipboard and swaps its own label to `copiedLabel`
 * for a moment as feedback — the same pattern InviteCodeCard used to
 * implement itself before this got pulled out for the account-number
 * copies on the season report / admin settlement account.
 */
export function CopyButton({
  value,
  label = "복사",
  copiedLabel = "복사됨",
  variant = "secondary",
  size = "pill",
  className,
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  variant?: "primary" | "secondary" | "inverse" | "danger";
  size?: "full" | "auto" | "pill";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail (permissions, insecure context) — no
      // separate error UI, the button just never flips to "복사됨".
    }
  }

  return (
    <Button size={size} variant={variant} className={className} onClick={copy}>
      {copied ? copiedLabel : label}
    </Button>
  );
}
