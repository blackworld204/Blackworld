"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CurrencyFlag } from "@/components/currency-flag";

export type CurrencyOption = {
  code: string;
  label: string;
};

export function CurrencySelect({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: CurrencyOption[];
  onChange: (code: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = options.find((item) => item.code === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="ccy" ref={root}>
      <button
        type="button"
        className="ccy-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        onClick={() => setOpen((next) => !next)}
      >
        {current ? <CurrencyFlag code={current.code} /> : null}
        <span>{current?.label ?? value}</span>
      </button>
      {open ? (
        <ul className="ccy-menu" id={listId} role="listbox" aria-label={label}>
          {options.map((item) => (
            <li key={item.code}>
              <button
                type="button"
                role="option"
                aria-selected={item.code === value}
                onClick={() => {
                  onChange(item.code);
                  setOpen(false);
                }}
              >
                <CurrencyFlag code={item.code} />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
