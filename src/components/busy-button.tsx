"use client";

import { useEffect, useRef, type ButtonHTMLAttributes } from "react";

export function BusyButton({
  busy = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const button = ref.current;
    const row = button?.parentElement;
    if (!busy || !button || !row?.classList.contains("form-row")) return;
    const locked: HTMLElement[] = [];
    for (const el of row.querySelectorAll<HTMLElement>(":scope > button, :scope > a.btn, :scope > a.text-button")) {
      if (el === button || el.hasAttribute("inert")) continue;
      el.setAttribute("inert", "");
      locked.push(el);
    }
    return () => {
      for (const el of locked) el.removeAttribute("inert");
    };
  }, [busy]);

  return (
    <button
      ref={ref}
      type={type}
      className={className}
      {...props}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {busy ? <span className="btn-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
