"use client";

import { useEffect, useState } from "react";
import { SANDBOX_RATES, type RateBook } from "@/lib/rates";

const EMPTY: RateBook = { rates: SANDBOX_RATES, date: null, asOf: null, status: "loading" };

let book = EMPTY;
const listeners = new Set<(next: RateBook) => void>();
let source: EventSource | null = null;
let failures = 0;

function publish(next: RateBook) {
  book = next;
  for (const listener of listeners) listener(book);
}

function openStream() {
  if (source || typeof EventSource === "undefined") return;
  source = new EventSource("/api/rates/stream");
  source.onmessage = (event) => {
    failures = 0;
    try {
      const next = JSON.parse(event.data) as RateBook;
      if (!next?.rates?.length) return;
      publish(next);
    } catch {
      /* A partial chunk is ignored. The next quote replaces it. */
    }
  };
  source.onerror = () => {
    failures += 1;
    if (failures < 3 || book.status === "live") return;
    publish({ rates: SANDBOX_RATES, date: null, asOf: null, status: "sandbox" });
  };
}

export function subscribeRates(listener: (next: RateBook) => void) {
  listeners.add(listener);
  listener(book);
  openStream();
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0 || !source) return;
    source.close();
    source = null;
    failures = 0;
  };
}

export function useLiveRates() {
  const [value, setValue] = useState(book);
  useEffect(() => subscribeRates(setValue), []);
  return value;
}
