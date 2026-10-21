export type Currency = {
  code: string;
  name: string;
  perUsd: number;
};

export const SANDBOX_RATES: Currency[] = [
  { code: "USD", name: "US Dollar", perUsd: 1 },
  { code: "EUR", name: "Euro", perUsd: 0.92 },
  { code: "GBP", name: "British Pound", perUsd: 0.79 },
  { code: "JPY", name: "Japanese Yen", perUsd: 149.82 },
  { code: "CHF", name: "Swiss Franc", perUsd: 0.88 },
  { code: "CAD", name: "Canadian Dollar", perUsd: 1.35 },
  { code: "CNY", name: "Chinese Yuan", perUsd: 7.24 },
  { code: "AUD", name: "Australian Dollar", perUsd: 1.52 },
  { code: "SGD", name: "Singapore Dollar", perUsd: 1.34 },
];

export const PREVIEW_CODES = ["USD", "EUR", "GBP", "JPY", "CHF"];

export const FEE_RATE = 0.005;

export function convert(amount: number, from: Currency, to: Currency) {
  if (!Number.isFinite(amount)) return Number.NaN;
  const usd = amount / from.perUsd;
  return usd * to.perUsd;
}

export function formatAmount(code: string, value: number) {
  const digits = code === "JPY" ? 0 : 2;
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
  const codes = SANDBOX_RATES.filter((item) => item.code !== "USD")
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
