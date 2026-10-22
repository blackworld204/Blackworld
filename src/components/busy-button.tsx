"use client";

import type { ButtonHTMLAttributes } from "react";

export function BusyButton({
  busy = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      type={type}
      className={className}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy ? <span className="btn-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
