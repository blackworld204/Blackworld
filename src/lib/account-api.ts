import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  alertsOf,
  depositBreakdown,
  normalizeBank,
  OTP_TTL_MS,
  otpExpired,
  payReferralOnDeposit,
  transferFee,
  type BankApproval,
  type BankCard,
  type BankEvent,
  type BankNote,
  type BankState,
  type BankTx,
  type BankUser,
} from "@/lib/bank";
import { emptyBalances, isMoneyCode, moneyDigits, type MoneyCode } from "@/lib/currencies";
import { withDeskLock } from "@/lib/desk-store";
import { quotedRateBook } from "@/lib/rate-hub";
import { quoteConversion, type RateBook } from "@/lib/rates";
import { deliverEvents } from "@/lib/send-hook";
import { openState, sealState } from "@/lib/vault";

function money(code: string, value: number) {
  const factor = moneyDigits(code) === 0 ? 1 : 100;
  return Math.round(value * factor) / factor;
}

type Call = {
  method: string;
  path: string[];
  authorization: string | null;
  body: unknown;
  sessionEmail?: string | null;
};
type Reply = { status: number; body: unknown };

function nid(prefix: string) {
  return `${prefix}_${randomBytes(4).toString("hex")}`;
}

function text(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function sameKey(stored: string | undefined, given: string) {
  if (!stored || stored.length !== given.length || stored.length < 16)
    return false;
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

function eventFor(
  userId: string,
  title: string,
  body: string,
  at: string,
): BankEvent {
  return { id: nid("evt"), userId, title, body, at };
}

function pushEvent(state: BankState, event: BankEvent): BankState {
  return { ...state, events: [event, ...state.events].slice(0, 40) };
}

function referenceOf(input: Record<string, unknown>) {
  const ref = text(input.ref, 40);
  return /^[a-z0-9_]{4,40}$/i.test(ref) ? ref : "";
}

function pay(
  state: BankState,
  user: BankUser,
  input: Record<string, unknown>,
  options?: { force?: boolean },
):
  | { state: BankState; eventIds: string[]; value: unknown }
  | { error: string; status: number }
  | { value: unknown } {
  const currency = text(input.currency, 8).toUpperCase();
  const amount = typeof input.amount === "number" ? input.amount : Number.NaN;
  const holder = text(input.holder, 80);
  const bank = text(input.bank, 80);
  const account = text(input.account, 40);
  const routing = text(input.routing, 20);
  const swift = text(input.swift, 16);
  const note = text(input.note, 140);
  const reference = referenceOf(input);
  if (!isMoneyCode(currency))
    return { error: "Choose a currency.", status: 422 };
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000)
    return { error: "Enter an amount.", status: 422 };
  if (holder.length < 2 || bank.length < 2 || account.length < 4)
    return { error: "Enter the beneficiary.", status: 422 };
  if (reference) {
    const existing = state.txs.find(
      (item) =>
        item.ref === reference &&
        item.userId === user.id &&
        item.title === "Transfer",
    );
    if (existing) {
      return {
        value: {
          id: existing.id,
          status: "paid",
          amount: existing.amount,
          fee: transferFee(existing.amount),
          currency: existing.currency,
        },
      };
    }
    const waiting = state.approvals.find(
      (item) =>
        item.ref === reference &&
        item.userId === user.id &&
        item.status === "pending",
    );
    if (waiting && !options?.force) {
      return {
        value: {
          id: waiting.id,
          status: "pending",
          amount: waiting.amount,
          fee: waiting.fee,
          currency: waiting.currency,
        },
      };
    }
  }
  const rounded = money(currency, amount);
  const fee = transferFee(rounded);
  const at = new Date().toISOString();
  const detail = `${holder} · ${bank}${note ? ` · ${note}` : ""}`;
  if (!options?.force) {
    const balance = user.balances[currency] ?? 0;
    if (balance < rounded + fee - 0.001)
      return { error: "Not enough balance.", status: 422 };
    return queueOtp(state, user, {
      kind: "transfer",
      holder,
      bank,
      routing,
      swift,
      account,
      note,
      amount: rounded,
      currency,
      fee,
      ref: reference || undefined,
      title: "Transfer",
      detail,
      direction: "out",
      at,
    });
  }
  const moved = debit(state, user.id, currency, rounded, {
    title: "Transfer",
    detail,
    amount: rounded,
    direction: "out",
    ref: reference || undefined,
    status: "posted",
  });
  if ("error" in moved) return moved;
  if (fee <= 0)
    return {
      state: moved.state,
      eventIds: [moved.eventId],
      value: {
        id: moved.eventId,
        status: "paid",
        amount: rounded,
        fee,
        currency,
      },
    };
  const charged = debit(moved.state, user.id, currency, fee, {
    title: "Transfer fee",
    detail: "1% of the transfer",
    amount: fee,
    direction: "out",
    status: "posted",
  });
  if ("error" in charged) return charged;
  return {
    state: charged.state,
    eventIds: [moved.eventId, charged.eventId],
    value: {
      id: moved.eventId,
      status: "paid",
      amount: rounded,
      fee,
      currency,
    },
  };
}

function queueOtp(
  state: BankState,
  user: BankUser,
  input: {
    kind: "transfer" | "deposit" | "card" | "exchange";
    holder: string;
    bank: string;
    routing: string;
    swift: string;
    account: string;
    note: string;
    amount: number;
    currency: BankApproval["currency"];
    fee: number;
    ref?: string;
    title: string;
    detail: string;
    direction: "in" | "out";
    at: string;
    cardExpiry?: string;
    cardKind?: "virtual" | "physical";
    cardPrimary?: boolean;
    exchangeTo?: BankApproval["exchangeTo"];
    exchangeConverted?: number;
    exchangeRate?: number;
  },
) {
  const approvalId = nid("apr");
  const txId = nid("tx");
  const expiresAt = new Date(Date.parse(input.at) + OTP_TTL_MS).toISOString();
  const tx: BankTx = {
    id: txId,
    userId: user.id,
    title: input.title,
    detail: input.detail,
    amount: input.kind === "deposit" ? Math.max(0, input.amount - input.fee) : input.amount,
    currency: input.currency,
    direction: input.direction,
    at: input.at,
    ref: input.ref,
    status: "pending",
    approvalId,
    otpExpiresAt: expiresAt,
  };
  const row: BankApproval = {
    id: approvalId,
    userId: user.id,
    holder: input.holder,
    bank: input.bank,
    routing: input.routing,
    swift: input.swift,
    account: input.account,
    note: input.note,
    amount: input.amount,
    currency: input.currency,
    fee: input.fee,
    status: "pending",
    at: input.at,
    ref: input.ref,
    kind: input.kind,
    otpExpiresAt: expiresAt,
    txId,
    cardExpiry: input.cardExpiry,
    cardKind: input.cardKind,
    cardPrimary: input.cardPrimary,
    exchangeTo: input.exchangeTo,
    exchangeConverted: input.exchangeConverted,
    exchangeRate: input.exchangeRate,
  };
  const body = `${input.holder} · ${input.currency} ${input.amount.toFixed(2)}`;
  const title =
    input.kind === "deposit"
      ? "Deposit waiting"
      : input.kind === "card"
        ? "Card waiting"
        : input.kind === "exchange"
          ? "Exchange waiting"
          : "OTP waiting";
  const waiting = eventFor(user.id, title, body, input.at);
  const recipients = new Set<string>([
    user.id,
    ...state.users.filter((item) => item.role === "admin").map((item) => item.id),
  ]);
  const notes: BankNote[] = [...recipients].map((userId) => ({
    id: nid("note"),
    userId,
    title,
    body: `${body}. For security purposes, get the 6-digit OTP from an admin within 24 hours.`,
    at: input.at,
    read: false,
    channel: "security",
    txId,
    ...(userId !== user.id ? { relatedUserId: user.id } : {}),
  }));
  return {
    state: pushEvent(
      {
        ...state,
        txs: [tx, ...state.txs],
        approvals: [row, ...state.approvals],
        notes: [...notes, ...state.notes],
      },
      waiting,
    ),
    eventIds: [waiting.id],
    value: {
      id: row.id,
      txId,
      status: "pending",
      amount: tx.amount,
      fee: input.fee,
      currency: input.currency,
      expiresAt,
    },
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
  if (nextBalance < -0.001)
    return { error: "Not enough balance.", status: 422 };
  const at = new Date().toISOString();
  const record: BankTx = { id: nid("tx"), userId, currency: code, at, ...tx };
  const body = `−${code} ${amount.toFixed(2)}. ${tx.detail}`;
  const event = eventFor(userId, tx.title, body, at);
  const note: BankNote = {
    id: nid("note"),
    userId,
    title: tx.title,
    body,
    at,
    read: false,
    channel: "transfer",
    txId: record.id,
  };
  return {
    eventId: event.id,
    state: pushEvent(
      {
        ...state,
        users: state.users.map((item) =>
          item.id === userId
            ? {
                ...item,
                balances: {
                  ...item.balances,
                  [code]: money(code, nextBalance),
                },
              }
            : item,
        ),
        txs: [record, ...state.txs],
        notes: alertsOf(user).transfers ? [note, ...state.notes] : state.notes,
      },
      event,
    ),
  };
}

function credit(
  state: BankState,
  userId: string,
  code: MoneyCode,
  amount: number,
  tx: Omit<BankTx, "id" | "at" | "userId" | "currency">,
): { state: BankState; eventId: string } | { error: string; status: number } {
  const user = state.users.find((item) => item.id === userId);
  if (!user) return { error: "Account not found.", status: 404 };
  const nextBalance = user.balances[code] + amount;
  const at = new Date().toISOString();
  const record: BankTx = { id: nid("tx"), userId, currency: code, at, ...tx };
  const body = `+${code} ${amount.toFixed(2)}. ${tx.detail}`;
  const event = eventFor(userId, tx.title, body, at);
  const note: BankNote = {
    id: nid("note"),
    userId,
    title: tx.title,
    body,
    at,
    read: false,
    channel: "transfer",
    txId: record.id,
  };
  return {
    eventId: event.id,
    state: pushEvent(
      {
        ...state,
        users: state.users.map((item) =>
          item.id === userId
            ? {
                ...item,
                balances: {
                  ...item.balances,
                  [code]: money(code, nextBalance),
                },
              }
            : item,
        ),
        txs: [record, ...state.txs],
        notes: alertsOf(user).transfers ? [note, ...state.notes] : state.notes,
      },
      event,
    ),
  };
}

function deposit(
  state: BankState,
  user: BankUser,
  input: Record<string, unknown>,
) {
  const amount = typeof input.amount === "number" ? input.amount : Number.NaN;
  const method = text(input.method, 8);
  if (method !== "wire" && method !== "card")
    return { error: "Choose a deposit method.", status: 422 };
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000)
    return { error: "Enter an amount.", status: 422 };
  const cards = state.cards.filter((card) => card.userId === user.id);
  const chargeable = cards.filter((card) => !card.frozen);
  const card = chargeable.find((item) => item.primary) ?? chargeable[0];
  if (method === "card" && !card) {
    return {
      error: cards.length
        ? "Unfreeze a card before a card deposit."
        : "Add a card before using a card deposit.",
      status: 422,
    };
  }
  const { fee } = depositBreakdown(amount);
  const at = new Date().toISOString();
  const holder = method === "wire" ? "Wire deposit" : "Card deposit";
  const detail =
    method === "wire"
      ? `Fee USD ${fee.toFixed(2)}`
      : `Card •••• ${card?.last4 ?? ""} · fee USD ${fee.toFixed(2)}`;
  return queueOtp(state, user, {
    kind: "deposit",
    holder,
    bank: "Blackworld",
    routing: "",
    swift: "",
    account: user.email,
    note: detail,
    amount,
    currency: "USD",
    fee,
    title: holder,
    detail,
    direction: "in",
    at,
  });
}

function overCardSpend(
  state: BankState,
  userId: string,
  code: string,
  amount: number,
) {
  if (code !== "USD") return null;
  const cards = state.cards.filter((card) => card.userId === userId && !card.frozen);
  const card = cards.find((item) => item.primary) ?? cards[0];
  if (!card || typeof card.spendLimit !== "number") return null;
  if (amount <= card.spendLimit + 0.001) return null;
  return "That is above the card spend limit.";
}

function runDueSchedules(state: BankState) {
  const today = new Date().toISOString().slice(0, 10);
  const due = state.schedules.filter((item) => item.status === "scheduled" && item.runOn <= today);
  let cursor = state;
  const eventIds: string[] = [];
  const results: { id: string; status: string }[] = [];
  for (const item of due) {
    const owner = cursor.users.find((user) => user.id === item.userId && user.status === "active");
    const paid = owner
      ? pay(cursor, owner, {
          holder: item.holder,
          bank: item.bank,
          routing: item.routing,
          swift: item.swift,
          account: item.account,
          note: item.note,
          amount: item.amount,
          currency: item.currency,
          ref: item.id,
        })
      : { error: "Account not found.", status: 404 };
    const value = !("error" in paid) ? paid.value : null;
    const pending =
      !!value &&
      typeof value === "object" &&
      "status" in value &&
      (value as { status?: string }).status === "pending";
    const status = ("error" in paid ? "failed" : pending ? "held" : "paid") as "failed" | "held" | "paid";
    const settled =
      !("error" in paid) && "eventIds" in paid
        ? (paid as { state: BankState; eventIds: string[]; value: unknown })
        : null;
    const next = settled?.state ?? cursor;
    if (settled) eventIds.push(...settled.eventIds);
    cursor = {
      ...next,
      schedules: next.schedules.map((row) => (row.id === item.id ? { ...row, status } : row)),
    };
    results.push({ id: item.id, status });
  }
  return { state: cursor, eventIds, value: { schedules: results } };
}

function exchange(
  state: BankState,
  user: BankUser,
  input: Record<string, unknown>,
  book: RateBook,
  options?: { force?: boolean },
) {
  const from = text(input.from, 8).toUpperCase();
  const to = text(input.to, 8).toUpperCase();
  const amount = typeof input.amount === "number" ? input.amount : Number.NaN;
  if (!isMoneyCode(from) || !isMoneyCode(to) || from === to)
    return { error: "Choose a currency.", status: 422 };
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000)
    return { error: "Enter an amount.", status: 422 };
  const source = book.rates.find((item) => item.code === from);
  const target = book.rates.find((item) => item.code === to);
  if (!source || !target) return { error: "Choose a currency.", status: 422 };
  const quoted = quoteConversion(amount, source, target);
  if (!Number.isFinite(quoted.converted) || !Number.isFinite(quoted.rate))
    return { error: "Rates are not available.", status: 502 };
  const over = overCardSpend(state, user.id, from, quoted.amount);
  if (over) return { error: over, status: 422 };
  const at = new Date().toISOString();
  if (!options?.force) {
    if ((user.balances[from] ?? 0) < quoted.amount - 0.001)
      return { error: "Not enough balance.", status: 422 };
    return queueOtp(state, user, {
      kind: "exchange",
      holder: `${from} → ${to}`,
      bank: "Exchange",
      routing: "",
      swift: "",
      account: to,
      note: `Rate ${quoted.rate.toFixed(6)}`,
      amount: quoted.amount,
      currency: from,
      fee: quoted.fee,
      title: "Exchange",
      detail: `${from} to ${to} · fee ${quoted.fee.toFixed(2)}`,
      direction: "out",
      at,
      exchangeTo: to,
      exchangeConverted: quoted.converted,
      exchangeRate: quoted.rate,
    });
  }
  const out = debit(state, user.id, from, quoted.amount, {
    title: "Exchange out",
    detail: `${from} to ${to} · fee ${quoted.fee.toFixed(2)}`,
    amount: quoted.amount,
    direction: "out",
    status: "posted",
  });
  if ("error" in out) return out;
  const inn = credit(out.state, user.id, to, quoted.converted, {
    title: "Exchange in",
    detail: `${from} to ${to}`,
    amount: quoted.converted,
    direction: "in",
    status: "posted",
  });
  if ("error" in inn) return inn;
  return {
    state: inn.state,
    eventIds: [out.eventId, inn.eventId],
    value: {
      from,
      to,
      amount: quoted.amount,
      fee: quoted.fee,
      converted: quoted.converted,
      rate: quoted.rate,
      status: "paid",
    },
  };
}

function markApproval(
  state: BankState,
  approvalId: string,
  status: BankApproval["status"],
  txStatus?: BankTx["status"],
) {
  const row = state.approvals.find((item) => item.id === approvalId);
  return {
    ...state,
    approvals: state.approvals.map((item) =>
      item.id === approvalId ? { ...item, status } : item,
    ),
    txs: state.txs.map((item) =>
      row?.txId && item.id === row.txId
        ? { ...item, status: txStatus ?? item.status }
        : item,
    ),
  };
}

function dropPendingTx(state: BankState, txId: string | undefined) {
  if (!txId) return state;
  return { ...state, txs: state.txs.filter((item) => item.id !== txId) };
}

function completeApproval(
  state: BankState,
  row: BankApproval,
  options?: { otpVerified?: boolean },
) {
  // Money / card changes only after the member enters the OTP an admin created.
  if (!options?.otpVerified) {
    return { error: "OTP verification is required before this can finish.", status: 403 };
  }
  const payer = state.users.find((item) => item.id === row.userId);
  if (!payer || payer.status !== "active")
    return { error: "Account not found.", status: 404 };
  if (row.kind === "exchange") {
    const to = row.exchangeTo;
    const converted = row.exchangeConverted;
    const rate = row.exchangeRate;
    if (!to || !isMoneyCode(to) || typeof converted !== "number" || typeof rate !== "number") {
      return { error: "That exchange request is incomplete.", status: 422 };
    }
    const without = dropPendingTx(state, row.txId);
    const out = debit(without, row.userId, row.currency, row.amount, {
      title: "Exchange out",
      detail: `${row.currency} to ${to} · fee ${row.fee.toFixed(2)}`,
      amount: row.amount,
      direction: "out",
      status: "posted",
    });
    if ("error" in out) return out;
    const inn = credit(out.state, row.userId, to, converted, {
      title: "Exchange in",
      detail: `${row.currency} to ${to}`,
      amount: converted,
      direction: "in",
      status: "posted",
    });
    if ("error" in inn) return inn;
    return {
      state: markApproval(inn.state, row.id, "approved"),
      eventIds: [out.eventId, inn.eventId],
      value: {
        id: row.id,
        status: "approved",
        from: row.currency,
        to,
        amount: row.amount,
        fee: row.fee,
        converted,
        rate,
      },
    };
  }
  if (row.kind === "card") {
    const cleared = dropPendingTx(state, row.txId);
    const issued = issueCard(
      cleared,
      payer,
      {
        holder: row.holder,
        last4: row.account,
        expiry: row.cardExpiry,
        kind: row.cardKind,
        primary: row.cardPrimary,
      },
      { force: true },
    );
    if ("error" in issued) return issued;
    if (!("state" in issued) || !issued.state)
      return { value: { id: row.id, status: "approved" } };
    return {
      state: markApproval(issued.state, row.id, "approved"),
      eventIds: issued.eventIds,
      value: { id: row.id, status: "approved", ...(issued.value as object) },
    };
  }
  if (row.kind === "deposit") {
    const net = Math.round((row.amount - row.fee) * 100) / 100;
    const without = dropPendingTx(state, row.txId);
    const credited = credit(without, row.userId, "USD", net, {
      title: row.holder,
      detail: row.note || `Fee USD ${row.fee.toFixed(2)}`,
      amount: net,
      direction: "in",
      status: "posted",
    });
    if ("error" in credited) return credited;
    const reward = payReferralOnDeposit(credited.state, payer);
    const next = reward?.state ?? credited.state;
    return {
      state: markApproval(next, row.id, "approved"),
      eventIds: reward ? [credited.eventId, reward.eventId] : [credited.eventId],
      value: { id: row.id, status: "approved" },
    };
  }
  const without = dropPendingTx(state, row.txId);
  const paid = pay(without, payer, { ...row }, { force: true });
  if ("error" in paid) return paid;
  if (!("state" in paid) || !paid.state)
    return { value: { id: row.id, status: "approved" } };
  return {
    state: markApproval(paid.state, row.id, "approved"),
    eventIds: paid.eventIds,
    value: { id: row.id, status: "approved" },
  };
}

function decide(
  state: BankState,
  actor: BankUser,
  approvalId: string,
  approve: boolean,
) {
  if (actor.role !== "admin")
    return { error: "Only an admin can decide.", status: 403 };
  const row = state.approvals.find((item) => item.id === approvalId);
  if (!row || row.status !== "pending")
    return { error: "That transfer is no longer waiting.", status: 422 };
  if (otpExpired(row)) {
    return {
      state: markApproval(state, approvalId, "expired", "expired"),
      eventIds: [] as string[],
      status: 422,
      value: { id: row.id, status: "expired", error: "That OTP request has expired." },
    };
  }
  if (!approve) {
    return {
      state: markApproval(state, approvalId, "declined", "expired"),
      eventIds: [] as string[],
      value: { id: row.id, status: "declined" },
    };
  }
  // Never move money from Approve. Admin creates an OTP; the member must enter it.
  return {
    error: row.otpCode
      ? "The member must enter the admin OTP to finish this. Nothing has moved yet."
      : "Create an OTP for this request first. Nothing moves until that OTP is verified.",
    status: 422,
  };
}

function issueOtp(state: BankState, actor: BankUser, approvalId: string) {
  if (actor.role !== "admin")
    return { error: "Only an admin can create an OTP.", status: 403 };
  const row = state.approvals.find((item) => item.id === approvalId);
  if (!row || row.status !== "pending")
    return { error: "That request is no longer waiting.", status: 422 };
  if (!row.otpExpiresAt) {
    // Older approval rows: attach a fresh 24h OTP window.
  }
  if (otpExpired(row)) {
    return {
      state: markApproval(state, approvalId, "expired", "expired"),
      eventIds: [] as string[],
      status: 422,
      value: { id: row.id, status: "expired", error: "That OTP request has expired." },
    };
  }
  const code = String(100000 + (randomBytes(3).readUIntBE(0, 3) % 900000));
  const at = new Date().toISOString();
  const expiresAt = row.otpExpiresAt ?? new Date(Date.now() + OTP_TTL_MS).toISOString();
  const next: BankState = {
    ...state,
    approvals: state.approvals.map((item) =>
      item.id === approvalId
        ? { ...item, otpCode: code, otpIssuedAt: at, otpExpiresAt: expiresAt }
        : item,
    ),
    txs: state.txs.map((item) =>
      row.txId && item.id === row.txId
        ? { ...item, otpExpiresAt: expiresAt, approvalId: row.id, status: item.status ?? "pending" }
        : item,
    ),
  };
  const event = eventFor(
    row.userId,
    "OTP ready",
    `An admin created a 6-digit OTP for ${row.holder}.`,
    at,
  );
  return {
    state: pushEvent(next, event),
    eventIds: [event.id],
    value: { id: row.id, code, expiresAt },
  };
}

function sameOtp(stored: string, given: string) {
  if (!stored || stored.length !== given.length) return false;
  try {
    return timingSafeEqual(Buffer.from(stored), Buffer.from(given));
  } catch {
    return false;
  }
}

function verifyOtp(
  state: BankState,
  actor: BankUser,
  approvalId: string,
  code: string,
) {
  const row = state.approvals.find((item) => item.id === approvalId);
  if (!row || row.status !== "pending")
    return { error: "That request is no longer waiting.", status: 422 };
  if (row.userId !== actor.id && actor.role !== "admin")
    return { error: "That request is not on this account.", status: 403 };
  if (otpExpired(row)) {
    return {
      state: markApproval(state, approvalId, "expired", "expired"),
      eventIds: [] as string[],
      status: 422,
      value: { id: row.id, status: "expired", error: "That OTP has expired." },
    };
  }
  const digits = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(digits))
    return { error: "Enter the 6-digit OTP from an admin.", status: 422 };
  // Only the OTP an admin generated for this request can release funds / finish the action.
  if (!row.otpCode || !row.otpIssuedAt)
    return { error: "An admin has not created an OTP yet. Nothing has moved.", status: 422 };
  if (!sameOtp(row.otpCode, digits))
    return { error: "That OTP does not match. Nothing has moved.", status: 422 };
  const burned: BankState = {
    ...state,
    approvals: state.approvals.map((item) =>
      item.id === approvalId
        ? { ...item, otpCode: undefined, otpIssuedAt: item.otpIssuedAt }
        : item,
    ),
  };
  const nextRow = burned.approvals.find((item) => item.id === approvalId) ?? {
    ...row,
    otpCode: undefined,
  };
  return completeApproval(burned, nextRow, { otpVerified: true });
}

function issueCard(
  state: BankState,
  user: BankUser,
  input: Record<string, unknown>,
  options?: { force?: boolean },
) {
  const holder = (text(input.holder, 80) || user.name).toUpperCase();
  const kind = input.kind === "physical" ? "physical" : "virtual";
  const last4 = text(input.last4, 4);
  const expiry = text(input.expiry, 5);
  const primary =
    input.primary === true ||
    !state.cards.some((item) => item.userId === user.id && item.primary);
  if (holder.length < 2)
    return { error: "Enter the name on the card.", status: 422 };
  if (!/^\d{4}$/.test(last4))
    return { error: "Enter the last 4 digits.", status: 422 };
  if (!/^\d{2}\/\d{2}$/.test(expiry))
    return { error: "Use expiry as MM/YY.", status: 422 };
  const month = Number(expiry.slice(0, 2));
  if (month < 1 || month > 12)
    return { error: "Use expiry as MM/YY.", status: 422 };
  if (
    state.cards.some(
      (card) => card.userId === user.id && card.last4 === last4,
    )
  ) {
    return { error: "That card is already on this account.", status: 422 };
  }
  const at = new Date().toISOString();
  if (!options?.force) {
    return queueOtp(state, user, {
      kind: "card",
      holder,
      bank: "Card",
      routing: "",
      swift: "",
      account: last4,
      note: `${kind} · ${expiry}`,
      amount: 0,
      currency: "USD",
      fee: 0,
      title: "Card",
      detail: `•••• ${last4} · ${kind}`,
      direction: "in",
      at,
      cardExpiry: expiry,
      cardKind: kind,
      cardPrimary: primary,
    });
  }
  const card: BankCard = {
    id: nid("card"),
    userId: user.id,
    holder,
    last4,
    expiry,
    primary,
    frozen: false,
    kind,
  };
  const cards = primary
    ? state.cards.map((item) =>
        item.userId === user.id ? { ...item, primary: false } : item,
      )
    : state.cards;
  const event = eventFor(
    user.id,
    "Card added",
    `${card.kind} · ${card.last4}`,
    at,
  );
  return {
    state: pushEvent({ ...state, cards: [card, ...cards] }, event),
    eventIds: [event.id],
    value: {
      id: card.id,
      last4: card.last4,
      expiry: card.expiry,
      kind: card.kind,
      status: "paid",
    },
  };
}

function openAccount(
  state: BankState,
  actor: BankUser,
  input: Record<string, unknown>,
) {
  if (actor.role !== "admin" && !actor.canCreate)
    return { error: "This key cannot open an account.", status: 403 };
  const name = text(input.name, 80);
  const email = text(input.email, 120).toLowerCase();
  const phone = text(input.phone, 40);
  const pin = text(input.pin, 8);
  if (name.length < 2) return { error: "Enter the account name.", status: 422 };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "Enter an email.", status: 422 };
  if (phone.replace(/\D/g, "").length < 7)
    return { error: "Enter a phone number.", status: 422 };
  if (!/^\d{4}$/.test(pin))
    return { error: "Enter a 4-digit PIN.", status: 422 };
  if (state.users.some((item) => item.email.toLowerCase() === email))
    return { error: "That email already has an account.", status: 422 };
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
  const welcome: BankNote = {
    id: nid("note"),
    userId: user.id,
    title: "Account opened",
    body: "Your account is ready.",
    at,
    read: false,
  };
  const notices: BankNote[] = state.users
    .filter((item) => item.role === "admin")
    .map((item) => ({
      id: nid("note"),
      userId: item.id,
      title: "Account opened",
      body: `${name} · ${email}`,
      at,
      read: false,
      relatedUserId: user.id,
    }));
  const next = pushEvent(
    {
      ...state,
      users: [user, ...state.users],
      notes: [welcome, ...notices, ...state.notes],
    },
    event,
  );
  return {
    state: next,
    eventIds: [event.id],
    value: { id: user.id, name, email, status: user.status },
  };
}

export async function runAccountCall(call: Call): Promise<Reply> {
  const key = bearer(call.authorization);
  const method = call.method.toUpperCase();
  const path = call.path.map((part) => part.toLowerCase());
  if (!key && !call.sessionEmail)
    return { status: 401, body: { error: "unauthorized" } };

  if (
    method === "GET" &&
    path[0] === "fx" &&
    path[1] === "rates" &&
    path.length === 2
  ) {
    const allowed = await knownActor(call);
    if (allowed !== "ok") return allowedReply(allowed);
    try {
      const book = await quotedRateBook();
      return {
        status: 200,
        body: {
          date: book.date,
          rates: book.rates.map((item) => ({
            code: item.code,
            perUsd: item.perUsd,
          })),
        },
      };
    } catch {
      return { status: 502, body: { error: "Rates are not available." } };
    }
  }

  if (
    method === "POST" &&
    path[0] === "fx" &&
    path[1] === "quotes" &&
    path.length === 2
  ) {
    const allowed = await knownActor(call);
    if (allowed !== "ok") return allowedReply(allowed);
    const record = recordOf(call.body);
    const from = text(record?.from, 8).toUpperCase();
    const to = text(record?.to, 8).toUpperCase();
    const amount =
      typeof record?.amount === "number" ? record.amount : Number.NaN;
    if (!isMoneyCode(from) || !isMoneyCode(to))
      return { status: 422, body: { error: "Choose a currency." } };
    if (!Number.isFinite(amount) || amount <= 0)
      return { status: 422, body: { error: "Enter an amount." } };
    try {
      const book = await quotedRateBook();
      const source = book.rates.find((item) => item.code === from);
      const target = book.rates.find((item) => item.code === to);
      if (!source || !target)
        return { status: 422, body: { error: "Choose a currency." } };
      const quoted = quoteConversion(amount, source, target);
      if (!Number.isFinite(quoted.converted) || !Number.isFinite(quoted.rate))
        return { status: 502, body: { error: "Rates are not available." } };
      return {
        status: 200,
        body: {
          ...quoted,
          expires: new Date(Date.now() + 30_000).toISOString(),
        },
      };
    } catch {
      return { status: 502, body: { error: "Rates are not available." } };
    }
  }

  let exchangeBook: RateBook | null = null;
  if (
    method === "POST" &&
    path[0] === "fx" &&
    path[1] === "exchanges" &&
    path.length === 2
  ) {
    const allowed = await knownActor(call);
    if (allowed !== "ok") return allowedReply(allowed);
    exchangeBook = await quotedRateBook().catch(() => null);
    if (!exchangeBook)
      return { status: 502, body: { error: "Rates are not available." } };
  }

  return withDeskLock(async (current) => {
    if (!current)
      return {
        file: null,
        value: { status: 503, body: { error: "The desk is not ready." } },
      };
    const plain = normalizeBank(openState(current.state));
    const user = call.sessionEmail
      ? plain.users.find(
          (item) =>
            item.email.toLowerCase() === call.sessionEmail!.toLowerCase(),
        )
      : plain.users.find((item) => sameKey(item.apiKey, key));
    if (!user)
      return {
        file: null,
        value: { status: 401, body: { error: "unauthorized" } },
      };
    if (user.status !== "active")
      return {
        file: null,
        value: { status: 403, body: { error: "This account is inactive." } },
      };

    const done = async (
      result:
        | {
            state?: BankState;
            eventIds?: string[];
            value: unknown;
            status?: number;
          }
        | { error: string; status: number },
    ) => {
      if ("error" in result)
        return {
          file: null,
          value: { status: result.status, body: { error: result.error } },
        };
      if (!result.state)
        return {
          file: null,
          value: { status: result.status ?? 200, body: result.value },
        };
      let sealed = result.state;
      try {
        sealed = sealState(result.state);
      } catch {
        sealed = result.state;
      }
      if (result.eventIds?.length)
        await deliverEvents(result.state, result.eventIds).catch(() => 0);
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
      if (!found || (found.id !== user.id && user.role !== "admin"))
        return done({ error: "Account not found.", status: 404 });
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
    if (
      method === "POST" &&
      path[0] === "payments" &&
      path[1] === "batch" &&
      path.length === 2
    ) {
      const rows = Array.isArray((recordOf(call.body) ?? {}).payments)
        ? (recordOf(call.body) as { payments: unknown[] }).payments
        : null;
      if (!rows || rows.length === 0 || rows.length > 20)
        return done({ error: "Enter the payments.", status: 422 });
      let cursor = plain;
      const eventIds: string[] = [];
      const results: unknown[] = [];
      for (const row of rows) {
        const paid = pay(cursor, user, recordOf(row) ?? {});
        if ("error" in paid) return done(paid);
        if ("state" in paid && paid.state) {
          cursor = paid.state;
          eventIds.push(...paid.eventIds);
        }
        results.push(paid.value);
      }
      return done({
        state: cursor,
        eventIds,
        value: {
          payments: results,
          balances: cursor.users.find((item) => item.id === user.id)?.balances,
        },
      });
    }
    if (method === "POST" && path[0] === "deposits" && path.length === 1) {
      return done(deposit(plain, user, recordOf(call.body) ?? {}));
    }
    if (
      method === "POST" &&
      path[0] === "fx" &&
      path[1] === "exchanges" &&
      path.length === 2
    ) {
      if (!exchangeBook)
        return done({ error: "Rates are not available.", status: 502 });
      return done(
        exchange(plain, user, recordOf(call.body) ?? {}, exchangeBook),
      );
    }
    if (
      method === "POST" &&
      path[0] === "schedules" &&
      path[1] === "run" &&
      path.length === 2
    ) {
      return done(runDueSchedules(plain));
    }
    if (method === "POST" && path[0] === "approvals" && path.length === 2) {
      const record = recordOf(call.body) ?? {};
      return done(
        decide(plain, user, call.path[1] ?? "", record.approve === true),
      );
    }
    if (
      method === "POST" &&
      path[0] === "approvals" &&
      path.length === 3 &&
      path[2] === "otp"
    ) {
      return done(issueOtp(plain, user, call.path[1] ?? ""));
    }
    if (
      method === "POST" &&
      path[0] === "approvals" &&
      path.length === 3 &&
      path[2] === "verify"
    ) {
      const record = recordOf(call.body) ?? {};
      return done(
        verifyOtp(plain, user, call.path[1] ?? "", text(record.code, 8)),
      );
    }
    return done({ error: "Not found.", status: 404 });
  });
}

function recordOf(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

async function knownActor(call: Call) {
  return withDeskLock(async (current) => {
    if (!current) return { file: null, value: "missing" as const };
    const plain = normalizeBank(openState(current.state));
    const user = call.sessionEmail
        ? plain.users.find(
            (item) =>
              item.email.toLowerCase() === call.sessionEmail!.toLowerCase() &&
              item.status === "active",
          )
        : plain.users.find(
            (item) =>
              sameKey(item.apiKey, bearer(call.authorization)) &&
              item.status === "active",
          );
    return {
      file: null,
      value: user ? ("ok" as const) : ("denied" as const),
    };
  });
}

function allowedReply(result: "ok" | "missing" | "denied"): Reply {
  if (result === "ok") return { status: 200, body: {} };
  if (result === "missing")
    return { status: 503, body: { error: "The desk is not ready." } };
  return { status: 401, body: { error: "unauthorized" } };
}
