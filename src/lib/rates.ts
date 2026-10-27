import { CURRENCIES, isFrankfurterCode, moneyDigits } from "@/lib/currencies";

export type Currency = {
  code: string;
  name: string;
  perUsd: number;
};

export const SANDBOX_RATES: Currency[] = CURRENCIES.map((item) => ({
  code: item.code,
  name: item.name,
  perUsd: item.perUsd,
}));

export const PREVIEW_CODES = ["USD", "EUR", "GBP", "JPY", "CHF"];

export const FEE_RATE = 0.005;

export function convert(amount: number, from: Currency, to: Currency) {
  if (!Number.isFinite(amount)) return Number.NaN;
  const usd = amount / from.perUsd;
  return usd * to.perUsd;
}

export function roundMoney(code: string, value: number) {
  const factor = moneyDigits(code) === 0 ? 1 : 100;
  return Math.round(value * factor) / factor;
}

/** Same 0.5% quote the converter, the exchange screen, and /api/v1 use. */
export function quoteConversion(amount: number, from: Currency, to: Currency) {
  const rounded = roundMoney(from.code, amount);
  const fee = roundMoney(from.code, rounded * FEE_RATE);
  const converted = roundMoney(to.code, convert(rounded - fee, from, to));
  const rate = from.perUsd === 0 ? Number.NaN : to.perUsd / from.perUsd;
  return { from: from.code, to: to.code, amount: rounded, fee, converted, rate };
}

export function formatAmount(code: string, value: number) {
  const digits = moneyDigits(code);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatRate(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);
}

export type RateBook = {
  rates: Currency[];
  date: string | null;
  asOf: string | null;
  status: "loading" | "live" | "sandbox";
};

export function formatQuoteTime(asOf: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(asOf));
}

export async function loadLiveRates(signal?: AbortSignal): Promise<RateBook> {
  const codes = SANDBOX_RATES.filter((item) => item.code !== "USD" && isFrankfurterCode(item.code))
    .map((item) => item.code)
    .join(",");
  const response = await fetch(`https://api.frankfurter.dev/v1/latest?from=USD&to=${codes}`, { signal });
  if (!response.ok) throw new Error("rate request failed");
  const data = (await response.json()) as { date?: string; rates?: Record<string, number> };
  if (!data.rates) throw new Error("rate payload empty");
  return {
    status: "live",
    date: data.date ?? null,
    asOf: null,
    rates: SANDBOX_RATES.map((currency) =>
      currency.code === "USD" || data.rates?.[currency.code] == null
        ? currency
        : { ...currency, perUsd: data.rates[currency.code] },
    ),
  };
}
