import { CURRENCIES, FRANKFURTER_CODES } from "@/lib/currencies";
import { SANDBOX_RATES, loadLiveRates, type RateBook } from "@/lib/rates";

/** Yahoo typically quotes these as XXXUSD (USD per unit); others as USDXXX (units per USD). */
const INVERT = new Set(["EUR", "GBP", "AUD", "NZD"]);

/** Liquid pairs we refresh live; every ISO currency still appears via sandbox/Frankfurter fallbacks. */
const LIVE = new Set<string>([
  ...FRANKFURTER_CODES,
  "NGN",
  "AED",
  "ARS",
  "COP",
  "EGP",
  "GHS",
  "KES",
  "MAD",
  "PKR",
  "QAR",
  "RUB",
  "SAR",
  "TWD",
  "UAH",
  "VND",
]);

const QUOTES = CURRENCIES.filter((item) => item.code !== "USD" && LIVE.has(item.code)).map((item) => ({
  symbol: INVERT.has(item.code) ? `${item.code}USD=X` : `USD${item.code}=X`,
  code: item.code,
  invert: INVERT.has(item.code),
}));

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

/** The book the dashboard is showing, or the same fallback the dashboard uses. */
export async function quotedRateBook(): Promise<RateBook> {
  if (latest.status !== "live") await pull();
  if (latest.status === "live" || (latest.status === "sandbox" && latest.rates.length > 0)) return latest;
  try {
    const daily = await loadLiveRates();
    publish(daily);
    return daily;
  } catch {
    const sandbox: RateBook = { rates: SANDBOX_RATES, date: null, asOf: null, status: "sandbox" };
    publish(sandbox);
    return sandbox;
  }
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
