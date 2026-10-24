import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  alertsOf,
  needsApproval,
  normalizeBank,
  transferFee,
  type BankApproval,
  type BankCard,
  type BankEvent,
  type BankNote,
  type BankState,
  type BankTx,
  type BankUser,
} from "@/lib/bank";
import { emptyBalances, isMoneyCode, type MoneyCode } from "@/lib/currencies";
import { withDeskLock } from "@/lib/desk-store";
import { FEE_RATE, convert, loadLiveRates } from "@/lib/rates";
import { deliverEvents } from "@/lib/send-hook";
import { openState, sealState } from "@/lib/vault";

type Call = { method: string; path: string[]; authorization: string | null; body: unknown };
type Reply = { status: number; body: unknown };

function nid(prefix: string) {
  return `${prefix}_${randomBytes(4).toString("hex")}`;
}

function money(code: string, value: number) {
  const factor = code === "JPY" ? 1 : 100;
  return Math.round(value * factor) / factor;
}

function text(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function sameKey(stored: string | undefined, given: string) {
  if (!stored || stored.length !== given.length || stored.length < 16) return false;
  return timingSafeEqual(Buffer.from(stored), Buffer.from(given));
}

function bearer(header: string | null) {
  if (!header?.startsWith("Bearer ")) return "";
  return header.slice(7).trim();
}

function publicAccount(user: BankUser, state: BankState) {
  const txs = state.txs.filter((item) => item.userId === user.id).slice(0, 20);
  const cards = state.cards.filter((item) => item.userId === user.id);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    currency: user.displayCurrency ?? "USD",
    balances: user.balances,
    cards: cards.map((card) => ({
      id: card.id,
      holder: card.holder,
      last4: card.last4,
      expiry: card.expiry,
      kind: card.kind ?? "virtual",
      frozen: Boolean(card.frozen),
      primary: card.primary,
      spendLimit: card.spendLimit ?? null,
    })),
    transactions: txs.map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.detail,
      amount: item.amount,
      currency: item.currency,
      direction: item.direction,
      at: item.at,
    })),
  };
}

function eventFor(userId: string, title: string, body: string, at: string): BankEvent {
  return { id: nid("evt"), userId, title, body, at };
}

function pushEvent(state: BankState, event: BankEvent): BankState {
  return { ...state, events: [event, ...state.events].slice(0, 40) };
}

function pay(state: BankState, user: BankUser, input: Record<string, unknown>): { state: BankState; eventIds: string[]; value: unknown } | { error: string; status: number } {
  const currency = text(input.currency, 8).toUpperCase();
  const amount = typeof input.amount === "number" ? input.amount : Number.NaN;
  const holder = text(input.holder, 80);
  const bank = text(input.bank, 80);
  const account = text(input.account, 40);
  const routing = text(input.routing, 20);
  const swift = text(input.swift, 16);
  const note = text(input.note, 140);
  if (!isMoneyCode(currency)) return { error: "Choose a currency.", status: 422 };
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) return { error: "Enter an amount.", status: 422 };
  if (holder.length < 2 || bank.length < 2 || account.length < 4) return { error: "Enter the beneficiary.", status: 422 };
  const rounded = money(currency, amount);
  const fee = transferFee(rounded);
  const at = new Date().toISOString();
  if (needsApproval(user, rounded + fee)) {
    const row: BankApproval = {
      id: nid("apr"),
      userId: user.id,
      holder,
      bank,
      routing,
      swift,
      account,
      note,
      amount: rounded,
      currency,
      fee,
      status: "pending",
      at,
    };
    const waiting = eventFor(user.id, "Approval waiting", `${holder} · ${currency} ${rounded.toFixed(2)}`, at);
    const next = pushEvent({ ...state, approvals: [row, ...state.approvals] }, waiting);
    return { state: next, eventIds: [waiting.id], value: { id: row.id, status: "pending", amount: rounded, fee, currency } };
  }
  const moved = debit(state, user.id, currency, rounded, {
    title: "Transfer",
    detail: `${holder} · ${bank}${note ? ` · ${note}` : ""}`,
    amount: rounded,
    direction: "out",
  });
  if ("error" in moved) return moved;
  if (fee <= 0) return { state: moved.state, eventIds: [moved.eventId], value: { id: moved.eventId, status: "paid", amount: rounded, fee, currency } };
  const charged = debit(moved.state, user.id, currency, fee, { title: "Transfer fee", detail: "1% of the transfer", amount: fee, direction: "out" });
  if ("error" in charged) return charged;
  return {
    state: charged.state,
    eventIds: [moved.eventId, charged.eventId],
    value: { id: moved.eventId, status: "paid", amount: rounded, fee, currency },
  };
}

function debit(
  state: BankState,
  userId: string,
  code: MoneyCode,
  amount: number,
  tx: Omit<BankTx, "id" | "at" | "userId" | "currency">,
): { state: BankState; eventId: string } | { error: string; status: number } {
  const user = state.users.find((item) => item.id === userId);
  if (!user) return { error: "Account not found.", status: 404 };
  const nextBalance = user.balances[code] - amount;
  if (nextBalance < -0.001) return { error: "Not enough balance.", status: 422 };
  const at = new Date().toISOString();
  const record: BankTx = { id: nid("tx"), userId, currency: code, at, ...tx };
  const body = `−${code} ${amount.toFixed(2)}. ${tx.detail}`;
  const event = eventFor(userId, tx.title, body, at);
  const note: BankNote = { id: nid("note"), userId, title: tx.title, body, at, read: false, channel: "transfer" };
  return {
    eventId: event.id,
    state: pushEvent(
      {
        ...state,
        users: state.users.map((item) =>
          item.id === userId ? { ...item, balances: { ...item.balances, [code]: money(code, nextBalance) } } : item,
        ),
        txs: [record, ...state.txs],
        notes: alertsOf(user).transfers ? [note, ...state.notes] : state.notes,
      },
      event,
    ),
  };
}

function issueCard(state: BankState, user: BankUser, input: Record<string, unknown>) {
  const holder = text(input.holder, 80) || user.name;
  const kind = input.kind === "physical" ? "physical" : "virtual";
  const spendLimit = typeof input.spendLimit === "number" && input.spendLimit > 0 ? money("USD", input.spendLimit) : undefined;
  if (holder.length < 2) return { error: "Enter the name on the card.", status: 422 };
  const used = new Set(state.cards.filter((card) => card.userId === user.id).map((card) => card.last4));
  let last4 = "";
  for (let attempt = 0; attempt < 30 && !last4; attempt += 1) {
    const next = String(randomBytes(2).readUInt16BE(0) % 9000 + 1000);
    if (!used.has(next)) last4 = next;
  }
  if (!last4) return { error: "A card could not be issued.", status: 422 };
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 3);
  const at = new Date().toISOString();
  const card: BankCard = {
    id: nid("card"),
    userId: user.id,
    holder: holder.toUpperCase(),
    last4,
    expiry: `${String(expiryDate.getMonth() + 1).padStart(2, "0")}/${String(expiryDate.getFullYear()).slice(-2)}`,
    primary: !state.cards.some((item) => item.userId === user.id && item.primary),
    frozen: false,
    kind,
    spendLimit,
  };
  const event = eventFor(user.id, "Card issued", `${card.kind} · ${card.last4}`, at);
  return {
    state: pushEvent({ ...state, cards: [card, ...state.cards] }, event),
    eventIds: [event.id],
    value: { id: card.id, last4: card.last4, expiry: card.expiry, kind: card.kind, spendLimit: card.spendLimit ?? null },
  };
}

function openAccount(state: BankState, actor: BankUser, input: Record<string, unknown>) {
  if (actor.role !== "admin" && !actor.canCreate) return { error: "This key cannot open an account.", status: 403 };
  const name = text(input.name, 80);
  const email = text(input.email, 120).toLowerCase();
  const phone = text(input.phone, 40);
  const pin = text(input.pin, 8);
  if (name.length < 2) return { error: "Enter the account name.", status: 422 };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter an email.", status: 422 };
  if (phone.replace(/\D/g, "").length < 7) return { error: "Enter a phone number.", status: 422 };
  if (!/^\d{4}$/.test(pin)) return { error: "Enter a 4-digit PIN.", status: 422 };
  if (state.users.some((item) => item.email.toLowerCase() === email)) return { error: "That email already has an account.", status: 422 };
  const at = new Date().toISOString();
  const user: BankUser = {
    id: nid("usr"),
    name,
    email,
    phone,
    role: "member",
    status: "active",
    canCreate: false,
    balances: emptyBalances(),
    memberSince: at.slice(0, 10),
    pin,
  };
  const event = eventFor(actor.id, "Account opened", `${name} · ${email}`, at);
  const next = pushEvent({ ...state, users: [user, ...state.users] }, event);
  return { state: next, eventIds: [event.id], value: { id: user.id, name, email, status: user.status } };
}

export async function runAccountCall(call: Call): Promise<Reply> {
  const key = bearer(call.authorization);
  const method = call.method.toUpperCase();
  const path = call.path.map((part) => part.toLowerCase());
  if (!key) return { status: 401, body: { error: "unauthorized" } };

  if (method === "GET" && path[0] === "fx" && path[1] === "rates" && path.length === 2) {
    const allowed = await knownKey(key);
    if (allowed !== "ok") return allowedReply(allowed);
    try {
      const book = await loadLiveRates();
      return { status: 200, body: { date: book.date, rates: book.rates.map((item) => ({ code: item.code, perUsd: item.perUsd })) } };
    } catch {
      return { status: 502, body: { error: "Rates are not available." } };
    }
  }

  if (method === "POST" && path[0] === "fx" && path[1] === "quotes" && path.length === 2) {
    const allowed = await knownKey(key);
    if (allowed !== "ok") return allowedReply(allowed);
    const record = recordOf(call.body);
    const from = text(record?.from, 8).toUpperCase();
    const to = text(record?.to, 8).toUpperCase();
    const amount = typeof record?.amount === "number" ? record.amount : Number.NaN;
    if (!isMoneyCode(from) || !isMoneyCode(to)) return { status: 422, body: { error: "Choose a currency." } };
    if (!Number.isFinite(amount) || amount <= 0) return { status: 422, body: { error: "Enter an amount." } };
    try {
      const book = await loadLiveRates();
      const source = book.rates.find((item) => item.code === from);
      const target = book.rates.find((item) => item.code === to);
      if (!source || !target) return { status: 422, body: { error: "Choose a currency." } };
      const fee = money(from, amount * FEE_RATE);
      const converted = money(to, convert(amount - fee, source, target));
      return {
        status: 200,
        body: { from, to, amount: money(from, amount), fee, converted, rate: target.perUsd / source.perUsd, expires: new Date(Date.now() + 30_000).toISOString() },
      };
    } catch {
      return { status: 502, body: { error: "Rates are not available." } };
    }
  }

  return withDeskLock(async (current) => {
    if (!current) return { file: null, value: { status: 503, body: { error: "The desk is not ready." } } };
    let plain: BankState;
    try {
      plain = normalizeBank(openState(current.state));
    } catch {
      return { file: null, value: { status: 503, body: { error: "The desk is not ready." } } };
    }
    const user = plain.users.find((item) => sameKey(item.apiKey, key));
    if (!user) return { file: null, value: { status: 401, body: { error: "unauthorized" } } };
    if (user.status !== "active") return { file: null, value: { status: 403, body: { error: "This account is inactive." } } };

    const done = async (result: { state?: BankState; eventIds?: string[]; value: unknown; status?: number } | { error: string; status: number }) => {
      if ("error" in result) return { file: null, value: { status: result.status, body: { error: result.error } } };
      if (!result.state) return { file: null, value: { status: result.status ?? 200, body: result.value } };
      const sealed = sealState(result.state);
      if (result.eventIds?.length) await deliverEvents(result.state, result.eventIds).catch(() => 0);
      return {
        file: { revision: current.revision + 1, state: sealed },
        value: { status: result.status ?? 200, body: result.value },
      };
    };

    if (method === "GET" && path[0] === "accounts" && path.length === 1) {
      return done({ value: { accounts: [publicAccount(user, plain)] } });
    }
    if (method === "GET" && path[0] === "accounts" && path.length === 2) {
      const found = plain.users.find((item) => item.id === call.path[1]);
      if (!found || (found.id !== user.id && user.role !== "admin")) return done({ error: "Account not found.", status: 404 });
      return done({ value: publicAccount(found, plain) });
    }
    if (method === "POST" && path[0] === "accounts" && path.length === 1) {
      const opened = openAccount(plain, user, recordOf(call.body) ?? {});
      return done(opened);
    }
    if (method === "GET" && path[0] === "cards" && path.length === 1) {
      return done({ value: { cards: publicAccount(user, plain).cards } });
    }
    if (method === "POST" && path[0] === "cards" && path.length === 1) {
      return done(issueCard(plain, user, recordOf(call.body) ?? {}));
    }
    if (method === "POST" && path[0] === "payments" && path.length === 1) {
      return done(pay(plain, user, recordOf(call.body) ?? {}));
    }
    if (method === "POST" && path[0] === "payments" && path[1] === "batch" && path.length === 2) {
      const rows = Array.isArray((recordOf(call.body) ?? {}).payments) ? ((recordOf(call.body) as { payments: unknown[] }).payments) : null;
      if (!rows || rows.length === 0 || rows.length > 20) return done({ error: "Enter the payments.", status: 422 });
      let cursor = plain;
      const eventIds: string[] = [];
      const results: unknown[] = [];
      for (const row of rows) {
        const paid = pay(cursor, user, recordOf(row) ?? {});
        if ("error" in paid) return done(paid);
        cursor = paid.state;
        eventIds.push(...paid.eventIds);
        results.push(paid.value);
      }
      return done({
        state: cursor,
        eventIds,
        value: { payments: results, balances: cursor.users.find((item) => item.id === user.id)?.balances },
      });
    }
    return done({ error: "Not found.", status: 404 });
  });
}

function recordOf(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

async function knownKey(key: string) {
  return withDeskLock(async (current) => {
    if (!current) return { file: null, value: "missing" as const };
    try {
      const plain = normalizeBank(openState(current.state));
      const user = plain.users.find((item) => sameKey(item.apiKey, key) && item.status === "active");
      return { file: null, value: user ? ("ok" as const) : ("denied" as const) };
    } catch {
      return { file: null, value: "missing" as const };
    }
  });
}

function allowedReply(result: "ok" | "missing" | "denied"): Reply {
  if (result === "ok") return { status: 200, body: {} };
  if (result === "missing") return { status: 503, body: { error: "The desk is not ready." } };
  return { status: 401, body: { error: "unauthorized" } };
}
