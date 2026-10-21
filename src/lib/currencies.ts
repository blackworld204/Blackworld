export const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$", perUsd: 1 },
  { code: "EUR", name: "Euro", symbol: "€", perUsd: 0.92 },
  { code: "GBP", name: "British Pound", symbol: "£", perUsd: 0.79 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", perUsd: 149.82 },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", perUsd: 0.88 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", perUsd: 1.35 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", perUsd: 1.52 },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", perUsd: 7.24 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", perUsd: 1.34 },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", perUsd: 1550 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", perUsd: 84 },
  { code: "ZAR", name: "South African Rand", symbol: "R", perUsd: 18 },
  { code: "AED", name: "UAE Dirham", symbol: "AED", perUsd: 3.6725 },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", perUsd: 5.4 },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$", perUsd: 18.5 },
] as const;

export type MoneyCode = (typeof CURRENCIES)[number]["code"];

export const MONEY_CODES = CURRENCIES.map((item) => item.code);

export function isMoneyCode(value: string): value is MoneyCode {
  return (MONEY_CODES as readonly string[]).includes(value);
}

export function emptyBalances(usd = 0): Record<MoneyCode, number> {
  return Object.fromEntries(CURRENCIES.map((item) => [item.code, item.code === "USD" ? usd : 0])) as Record<
    MoneyCode,
    number
  >;
}

export function balancesOf(raw: Partial<Record<string, number>> | undefined): Record<MoneyCode, number> {
  const next = emptyBalances();
  if (!raw) return next;
  for (const item of CURRENCIES) {
    const value = raw[item.code];
    if (typeof value === "number" && Number.isFinite(value)) next[item.code] = value;
  }
  return next;
}
