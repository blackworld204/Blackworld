import { SANDBOX_RATES, loadLiveRates, type RateBook } from "@/lib/rates";

const QUOTES: { symbol: string; code: string; invert: boolean }[] = [
  { symbol: "EURUSD=X", code: "EUR", invert: true },
  { symbol: "GBPUSD=X", code: "GBP", invert: true },
  { symbol: "USDJPY=X", code: "JPY", invert: false },
  { symbol: "USDCHF=X", code: "CHF", invert: false },
  { symbol: "USDCAD=X", code: "CAD", invert: false },
  { symbol: "USDCNY=X", code: "CNY", invert: false },
  { symbol: "AUDUSD=X", code: "AUD", invert: true },
  { symbol: "USDSGD=X", code: "SGD", invert: false },
  { symbol: "USDNGN=X", code: "NGN", invert: false },
  { symbol: "USDINR=X", code: "INR", invert: false },
  { symbol: "USDZAR=X", code: "ZAR", invert: false },
  { symbol: "USDAED=X", code: "AED", invert: false },
  { symbol: "USDBRL=X", code: "BRL", invert: false },
  { symbol: "USDMXN=X", code: "MXN", invert: false },
];

type Listener = (book: RateBook) => void;

const listeners = new Set<Listener>();
let latest: RateBook = { rates: SANDBOX_RATES, date: null, asOf: null, status: "loading" };
let timer: ReturnType<typeof setInterval> | null = null;
let pulling = false;

function publish(next: RateBook) {
  latest = next;
  for (const listener of listeners) listener(latest);
}

async function pullYahoo(): Promise<RateBook | null> {
  const symbols = QUOTES.map((item) => item.symbol).join(",");
  const response = await fetch(
    `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${symbols}&range=1d&interval=1m`,
    {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    },
  );
  if (!response.ok) return null;
  const data = (await response.json()) as {
    spark?: { result?: { symbol?: string; response?: { meta?: { regularMarketPrice?: number } }[] }[] };
  };
  const prices = new Map<string, number>();
  for (const row of data.spark?.result ?? []) {
    const price = row.response?.[0]?.meta?.regularMarketPrice;
    if (row.symbol && typeof price === "number" && price > 0) prices.set(row.symbol, price);
  }
  if (prices.size === 0) return null;
  const asOf = new Date().toISOString();
  return {
    status: "live",
    date: asOf.slice(0, 10),
    asOf,
    rates: SANDBOX_RATES.map((currency) => {
      if (currency.code === "USD") return currency;
      const spec = QUOTES.find((item) => item.code === currency.code);
      const price = spec ? prices.get(spec.symbol) : undefined;
      if (!spec || !price) {
        return latest.rates.find((item) => item.code === currency.code) ?? currency;
      }
      const perUsd = spec.invert ? 1 / price : price;
      return { ...currency, perUsd: Math.round(perUsd * 1_000_000) / 1_000_000 };
    }),
  };
}

async function pull() {
  if (pulling) return;
  pulling = true;
  try {
    const live = await pullYahoo();
    if (live) {
      publish(live);
      return;
    }
    if (latest.status === "live") return;
    const daily = await loadLiveRates();
    publish(daily);
  } catch {
    if (latest.status === "live") return;
    publish({ rates: SANDBOX_RATES, date: null, asOf: null, status: "sandbox" });
  } finally {
    pulling = false;
  }
}

function ensure() {
  if (timer) return;
  void pull();
  timer = setInterval(() => void pull(), 4000);
}

export function subscribeRateHub(listener: Listener) {
  listeners.add(listener);
  listener(latest);
  ensure();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
