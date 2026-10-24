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
    if (!busy || !button) return;
    const held: HTMLElement[] = [];
    const disabled: Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement> = [];
    const hold = (el: HTMLElement) => {
      if (el === button || el.contains(button) || el.classList.contains("is-held")) return;
      el.classList.add("is-held");
      held.push(el);
      for (const field of el.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement>("input, textarea, select, button")) {
        if (field.disabled) continue;
        field.disabled = true;
        disabled.push(field);
      }
    };
    let node: HTMLElement | null = button;
    while (node?.parentElement && node.parentElement !== document.body) {
      const parent: HTMLElement = node.parentElement;
      for (const sibling of parent.children) {
        if (sibling instanceof HTMLElement) hold(sibling);
      }
      if (
        parent.classList.contains("page") ||
        parent.classList.contains("app-pad") ||
        parent.classList.contains("app-main") ||
        parent.classList.contains("balance-dialog") ||
        parent.classList.contains("confirm-dialog")
      ) {
        break;
      }
      node = parent;
    }
    for (const el of document.querySelectorAll<HTMLElement>(".sticky-top, footer, .app-side, .app-head")) hold(el);
    const row = button.parentElement;
    if (row?.classList.contains("form-row")) {
      for (const el of row.querySelectorAll<HTMLElement>(":scope > button, :scope > a.btn, :scope > a.text-button")) {
        if (el === button || el.hasAttribute("inert")) continue;
        el.setAttribute("inert", "");
        held.push(el);
      }
    }
    return () => {
      for (const el of held) {
        el.classList.remove("is-held");
        el.removeAttribute("inert");
      }
      for (const field of disabled) field.disabled = false;
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
