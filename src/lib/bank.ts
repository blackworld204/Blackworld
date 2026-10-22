import { CURRENCIES, balancesOf, emptyBalances, isMoneyCode, type MoneyCode } from "@/lib/currencies";
import { isSealed } from "@/lib/sealed";
import { openRemote, sealRemote, stateNeedsOpen } from "@/lib/vault-client";

function storedText(value: unknown) {
  if (isSealed(value)) return value;
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
}

export type { MoneyCode };

export type BankUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "member";
  status: "active" | "inactive";
  canCreate: boolean;
  balances: Record<MoneyCode, number>;
  memberSince: string;
  pin: string;
  monthlyLimit?: Partial<Record<MoneyCode, number>>;
  savingsTarget?: Partial<Record<MoneyCode, number>>;
  displayCurrency?: MoneyCode;
  twoFactor?: boolean;
  apiKey?: string;
  webhookUrl?: string;
  approvalLimit?: number;
  totpSecret?: string;
  recoveryCodes?: string[];
  alerts?: AlertPrefs;
  privacy?: PrivacyPrefs;
  hasPhoto?: boolean;
  address?: BankAddress;
  pushTokens?: string[];
};

export type BankAddress = {
  street: string;
  city: string;
  zip: string;
  country: string;
};

export type PrivacyPrefs = {
  statementEmail: boolean;
  marketing: boolean;
};

export type AlertPrefs = {
  transfers: boolean;
  security: boolean;
  statements: boolean;
};

export const DEFAULT_ALERTS: AlertPrefs = {
  transfers: true,
  security: true,
  statements: true,
};

export const DEFAULT_PRIVACY: PrivacyPrefs = {
  statementEmail: true,
  marketing: false,
};

export function privacyOf(user: BankUser): PrivacyPrefs {
  return { ...DEFAULT_PRIVACY, ...user.privacy };
}

export function alertsOf(user: BankUser): AlertPrefs {
  return { ...DEFAULT_ALERTS, ...user.alerts };
}

export type BankTx = {
  id: string;
  userId: string;
  title: string;
  detail: string;
  amount: number;
  currency: MoneyCode;
  direction: "in" | "out";
  at: string;
};

export type BankCard = {
  id: string;
  userId: string;
  holder: string;
  last4: string;
  expiry: string;
  primary: boolean;
  frozen?: boolean;
  kind?: "virtual" | "physical";
};

export type BankPayee = {
  id: string;
  userId: string;
  holder: string;
  bank: string;
  routing: string;
  swift: string;
  account: string;
  currency: MoneyCode;
};

export type BankReferral = {
  id: string;
  userId: string;
  company: string;
  email: string;
  at: string;
  status: "invited" | "earned";
  reward: number;
};

export const REFERRAL_REWARD = 250;

export type BankNote = {
  id: string;
  userId?: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
};

export type TransferDraft = {
  userId: string;
  holder: string;
  bank: string;
  routing: string;
  swift: string;
  account: string;
  note: string;
  amount: number;
  currency: MoneyCode;
};

export type BankSchedule = TransferDraft & {
  id: string;
  runOn: string;
  status: "scheduled" | "paid" | "failed" | "held";
};

export type BankApproval = TransferDraft & {
  id: string;
  fee: number;
  status: "pending" | "approved" | "declined";
  at: string;
};

export type BankEvent = {
  id: string;
  userId: string;
  title: string;
  body: string;
  at: string;
};

export type BankState = {
  users: BankUser[];
  txs: BankTx[];
  cards: BankCard[];
  notes: BankNote[];
  payees: BankPayee[];
  referrals: BankReferral[];
  schedules: BankSchedule[];
  approvals: BankApproval[];
  events: BankEvent[];
};

export const MONEY: { code: MoneyCode; name: string; symbol: string }[] = CURRENCIES.map((item) => ({
  code: item.code,
  name: item.name,
  symbol: item.symbol,
}));

const KEY = "blackworld-bank";
const EVENT = "blackworld-bank";

/** Presentation account. The password lives in Firebase Authentication, not in this file. */
export const PRESENTATION_EMAIL = "blackworld1656749@gmail.com";

type BankPersist = (state: BankState) => void;
let persistBank: BankPersist | null = null;
let applyingRemote = false;

export function setBankPersist(fn: BankPersist | null) {
  persistBank = fn;
}

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();

export function seedBank(): BankState {
  return {
    users: [
      {
        id: "usr_blackworld",
        name: "Blackworld",
        email: PRESENTATION_EMAIL,
        phone: "+234 807 736 8595",
        role: "admin",
        status: "active",
        canCreate: true,
        balances: emptyBalances(50000),
        memberSince: "2024-03-12",
        pin: "2580",
      },
    ],
    txs: [
      {
        id: "tx_open_bw",
        userId: "usr_blackworld",
        title: "Initial deposit",
        detail: "Opening balance",
        amount: 50000,
        currency: "USD",
        direction: "in",
        at: hoursAgo(19),
      },
    ],
    cards: [
      {
        id: "card_bw",
        userId: "usr_blackworld",
        holder: "BLACKWORLD",
        last4: "1656",
        expiry: "12/27",
        primary: true,
        frozen: false,
        kind: "physical",
      },
    ],
    payees: [
      {
        id: "pay_harbor_bw",
        userId: "usr_blackworld",
        holder: "Harbor & Co.",
        bank: "Atlantic Clearing",
        routing: "026009593",
        swift: "HARBPRSJ",
        account: "883120441",
        currency: "USD",
      },
    ],
    notes: [
      {
        id: "note_deposit_bw",
        userId: "usr_blackworld",
        title: "Deposit received",
        body: "USD 50,000.00 is available in your account.",
        at: hoursAgo(19),
        read: false,
      },
      {
        id: "note_admin_bw",
        userId: "usr_blackworld",
        title: "Admin mode",
        body: "This account can manage users, balances, and permissions.",
        at: hoursAgo(2),
        read: false,
      },
    ],
    referrals: [],
    schedules: [],
    approvals: [],
    events: [],
  };
}

export function normalizeBank(parsed: Partial<BankState>): BankState {
  const seed = seedBank();
  const users = (parsed.users ?? []).map((user) => ({
    ...user,
    twoFactor: Boolean(user.twoFactor),
    totpSecret:
      isSealed(user.totpSecret) || (typeof user.totpSecret === "string" && /^[A-Z2-7]{16,}$/.test(user.totpSecret))
        ? user.totpSecret
        : undefined,
    recoveryCodes: Array.isArray(user.recoveryCodes)
      ? user.recoveryCodes.filter((code) => isSealed(code) || (typeof code === "string" && /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)))
      : undefined,
    alerts: { ...DEFAULT_ALERTS, ...user.alerts },
    privacy: { ...DEFAULT_PRIVACY, ...user.privacy },
    hasPhoto: Boolean(user.hasPhoto),
    balances: balancesOf(user.balances),
    displayCurrency: user.displayCurrency && isMoneyCode(user.displayCurrency) ? user.displayCurrency : "USD",
    approvalLimit: typeof user.approvalLimit === "number" ? user.approvalLimit : 10000,
    apiKey: storedText(user.apiKey),
    pushTokens: Array.isArray(user.pushTokens)
      ? user.pushTokens.filter((token) => typeof token === "string" && token.length > 0).slice(-8)
      : undefined,
  }));
  const placeholderEmails = new Set(["johnsmith@gmail.com", "jordan.lee@blackworld.com"]);
  const placeholderIds = new Set(users.filter((user) => placeholderEmails.has(user.email.toLowerCase())).map((user) => user.id));
  const keptUsers = users.filter((user) => !placeholderIds.has(user.id));
  const presenter = seed.users.find((user) => user.email === PRESENTATION_EMAIL);
  const hasPresenter = keptUsers.some((user) => user.email.toLowerCase() === PRESENTATION_EMAIL);
  const owned = <T extends { userId?: string }>(rows: T[]) => rows.filter((row) => !row.userId || !placeholderIds.has(row.userId));
  const txs = owned(parsed.txs ?? []);
  const cards = owned((parsed.cards ?? []).map((card) => ({
    ...card,
    frozen: Boolean(card.frozen),
    kind: card.kind === "physical" || card.kind === "virtual" ? card.kind : card.primary ? "physical" : "virtual",
  })));
  const payees = owned(Array.isArray(parsed.payees) ? parsed.payees : seed.payees);
  const notes = owned((parsed.notes ?? []).map((note) => ({
    ...note,
    userId: typeof note.userId === "string" ? note.userId : undefined,
  })));
  const addingPresenter = Boolean(presenter && !hasPresenter);
  return {
    users: addingPresenter && presenter ? [...keptUsers, presenter] : keptUsers,
    txs: addingPresenter && presenter ? [...txs, ...seed.txs.filter((item) => item.userId === presenter.id)] : txs,
    cards: addingPresenter && presenter ? [...cards, ...seed.cards.filter((item) => item.userId === presenter.id)] : cards,
    notes: addingPresenter && presenter ? [...notes, ...seed.notes.filter((item) => item.userId === presenter.id)] : notes,
    payees: presenter && !hasPresenter ? [...payees, ...seed.payees.filter((item) => item.userId === presenter.id)] : payees,
    referrals: (Array.isArray(parsed.referrals) ? parsed.referrals : []).map((item) => ({
      ...item,
      status: item.status === "earned" ? "earned" as const : "invited" as const,
      reward: typeof item.reward === "number" ? item.reward : 0,
    })),
    schedules: Array.isArray(parsed.schedules) ? parsed.schedules : [],
    approvals: Array.isArray(parsed.approvals) ? parsed.approvals : [],
    events: Array.isArray(parsed.events) ? parsed.events : [],
  };
}

let memory: BankState | null = null;
let hydrating: Promise<BankState> | null = null;
let commitSerial = 0;

function readStored(): BankState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BankState>;
    if (!parsed.users?.length) return null;
    return normalizeBank(parsed);
  } catch {
    return null;
  }
}

export function loadBank(): BankState {
  if (memory) return memory;
  return readStored() ?? seedBank();
}

export function hydrateBank() {
  if (typeof window === "undefined") return Promise.resolve(seedBank());
  if (memory && !stateNeedsOpen(memory)) return Promise.resolve(memory);
  if (!hydrating) {
    hydrating = (async () => {
      const stored = readStored();
      let plain = stored ?? seedBank();
      if (stored && stateNeedsOpen(stored)) {
        const opened = await openRemote(stored);
        if (!opened) {
          memory = stored;
          return stored;
        }
        plain = normalizeBank(opened);
        memory = plain;
        window.dispatchEvent(new Event(EVENT));
        return plain;
      }
      memory = plain;
      const sealed = await sealRemote(plain);
      if (sealed) localStorage.setItem(KEY, JSON.stringify(sealed));
      window.dispatchEvent(new Event(EVENT));
      return plain;
    })().finally(() => {
      hydrating = null;
    });
  }
  return hydrating;
}

export function saveBank(next: BankState) {
  const clean = normalizeBank(next);
  memory = clean;
  window.dispatchEvent(new Event(EVENT));
  if (applyingRemote || stateNeedsOpen(clean)) return;
  const serial = ++commitSerial;
  void sealRemote(clean).then((sealed) => {
    if (!sealed || serial !== commitSerial) return;
    localStorage.setItem(KEY, JSON.stringify(sealed));
    persistBank?.(sealed);
  });
}

export async function replaceBank(incoming: BankState) {
  const stored = normalizeBank(JSON.parse(JSON.stringify(incoming)) as BankState);
  if (!stateNeedsOpen(stored)) {
    saveBank(stored);
    return;
  }
  const opened = await openRemote(stored);
  if (!opened) return;
  applyingRemote = true;
  try {
    memory = normalizeBank(opened);
    localStorage.setItem(KEY, JSON.stringify(stored));
    window.dispatchEvent(new Event(EVENT));
  } finally {
    applyingRemote = false;
  }
}

export function subscribeBank(fn: () => void) {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

export function userByEmail(state: BankState, email: string) {
  return state.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

const LOCALE_TAGS: Record<string, string> = {
  en: "en",
  es: "es",
  fr: "fr",
  de: "de",
  pt: "pt",
  zh: "zh-Hans",
  ja: "ja",
  ko: "ko",
  ar: "ar",
  hi: "hi",
};

export function localeTag(locale: string) {
  return LOCALE_TAGS[locale] ?? "en";
}

export function money(amount: number, code: MoneyCode, locale = "en") {
  const digits = code === "JPY" ? 0 : 2;
  return new Intl.NumberFormat(localeTag(locale), {
    style: "currency",
    currency: code,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

export function when(iso: string, locale = "en") {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(delta / 60000);
  const format = new Intl.RelativeTimeFormat(localeTag(locale), { numeric: "auto" });
  if (minutes < 1) return format.format(0, "second");
  if (minutes < 60) return format.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return format.format(-hours, "hour");
  const days = Math.round(hours / 24);
  return format.format(-days, "day");
}

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export function enableTotp(userId: string, secret: string, codes: string[]) {
  patchUser(userId, { totpSecret: secret, recoveryCodes: codes });
}

export function disableTotp(userId: string) {
  const state = loadBank();
  saveBank({
    ...state,
    users: state.users.map((user) => {
      if (user.id !== userId) return user;
      const next = { ...user };
      delete next.totpSecret;
      delete next.recoveryCodes;
      return next;
    }),
  });
}

export function consumeRecoveryCode(userId: string, code: string) {
  const normalized = code.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(normalized)) return false;
  const formatted = `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
  const state = loadBank();
  const user = state.users.find((item) => item.id === userId);
  if (!user?.recoveryCodes?.includes(formatted)) return false;
  patchUser(userId, { recoveryCodes: user.recoveryCodes.filter((item) => item !== formatted) });
  return true;
}

export function rememberPushToken(userId: string, token: string) {
  const state = loadBank();
  const user = state.users.find((item) => item.id === userId);
  if (!user || !token || user.pushTokens?.includes(token)) return;
  patchUser(userId, { pushTokens: [...(user.pushTokens ?? []), token].slice(-8) });
}

export function forgetPushToken(userId: string, token: string) {
  const state = loadBank();
  const user = state.users.find((item) => item.id === userId);
  if (!user?.pushTokens?.includes(token)) return;
  patchUser(userId, { pushTokens: user.pushTokens.filter((item) => item !== token) });
}

export function patchUser(userId: string, patch: Partial<BankUser>) {
  const safe = { ...patch };
  delete safe.role;
  delete safe.status;
  delete safe.canCreate;
  delete safe.balances;
  delete safe.email;
  delete safe.id;
  const state = loadBank();
  saveBank({
    ...state,
    users: state.users.map((user) => (user.id === userId ? { ...user, ...safe } : user)),
  });
}

function actingAdmin(state: BankState, actorId: string) {
  const actor = state.users.find((user) => user.id === actorId);
  if (!actor || actor.role !== "admin" || actor.status !== "active") return null;
  return actor;
}

export function setAccountStatus(actorId: string, userId: string, status: "active" | "inactive") {
  const state = loadBank();
  if (!actingAdmin(state, actorId)) return "Only an admin can change an account.";
  if (actorId === userId) return "An admin cannot change their own status.";
  if (!state.users.some((user) => user.id === userId)) return "Account not found.";
  saveBank({
    ...state,
    users: state.users.map((user) => (user.id === userId ? { ...user, status } : user)),
  });
  return null;
}

export function setCreateAccess(actorId: string, userId: string, canCreate: boolean) {
  const state = loadBank();
  if (!actingAdmin(state, actorId)) return "Only an admin can change access.";
  if (!state.users.some((user) => user.id === userId)) return "Account not found.";
  saveBank({
    ...state,
    users: state.users.map((user) => (user.id === userId ? { ...user, canCreate } : user)),
  });
  return null;
}

export function setAccountRole(actorId: string, userId: string, role: "admin" | "member") {
  const state = loadBank();
  if (!actingAdmin(state, actorId)) return "Only an admin can change a role.";
  if (actorId === userId) return "An admin cannot change their own role.";
  const target = state.users.find((user) => user.id === userId);
  if (!target) return "Account not found.";
  const admins = state.users.filter((user) => user.role === "admin").length;
  if (target.role === "admin" && role === "member" && admins <= 1) return "Keep at least one admin.";
  saveBank({
    ...state,
    users: state.users.map((user) => (user.id === userId ? { ...user, role } : user)),
  });
  return null;
}

export function adjustBalance(actorId: string, userId: string, code: MoneyCode, nextAmount: number) {
  const state = loadBank();
  if (!actingAdmin(state, actorId)) return "Only an admin can change a balance.";
  if (!state.users.some((user) => user.id === userId)) return "Account not found.";
  saveBank({
    ...state,
    users: state.users.map((user) =>
      user.id === userId
        ? { ...user, balances: { ...user.balances, [code]: Math.max(0, nextAmount) } }
        : user,
    ),
  });
  return null;
}

export function addUser(input: {
  name: string;
  email: string;
  phone: string;
  pin: string;
  balance: number;
  address?: BankAddress;
  issueCard?: boolean;
}): { error: string | null; last4: string | null } {
  const state = loadBank();
  if (state.users.some((user) => user.email.toLowerCase() === input.email.toLowerCase())) {
    return { error: "That email already has an account.", last4: null };
  }
  const user: BankUser = {
    id: id("usr"),
    name: input.name,
    email: input.email,
    phone: input.phone,
    role: "member",
    status: "active",
    canCreate: false,
    balances: emptyBalances(input.balance),
    memberSince: new Date().toISOString().slice(0, 10),
    pin: input.pin,
    address: input.address,
  };
  const tx: BankTx | null =
    input.balance > 0
      ? {
          id: id("tx"),
          userId: user.id,
          title: "Initial deposit",
          detail: "Opening balance",
          amount: input.balance,
          currency: "USD",
          direction: "in",
          at: new Date().toISOString(),
        }
      : null;
  const used = new Set(state.cards.map((card) => card.last4));
  let last4: string | null = null;
  if (input.issueCard) {
    last4 = "4242";
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const next = String(Math.floor(1000 + Math.random() * 9000));
      if (!used.has(next)) {
        last4 = next;
        break;
      }
    }
  }
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 3);
  const card: BankCard | null = last4
    ? {
        id: id("card"),
        userId: user.id,
        holder: input.name.toUpperCase(),
        last4,
        expiry: `${String(expiryDate.getMonth() + 1).padStart(2, "0")}/${String(expiryDate.getFullYear()).slice(-2)}`,
        primary: true,
        frozen: false,
        kind: "virtual",
      }
    : null;
  const openedAt = new Date().toISOString();
  const opened = state.users
    .filter((item) => item.role === "admin")
    .map((item) => ({
      id: id("note"),
      userId: item.id,
      title: "Account opened",
      body: `${input.name} · ${input.email}`,
      at: openedAt,
      read: false,
    }));
  const welcome: BankNote = {
    id: id("note"),
    userId: user.id,
    title: "Account opened",
    body: "Your account is ready.",
    at: openedAt,
    read: false,
  };
  saveBank({
    ...state,
    users: [user, ...state.users],
    txs: tx ? [tx, ...state.txs] : state.txs,
    cards: card ? [card, ...state.cards] : state.cards,
    notes: [welcome, ...opened, ...state.notes],
  });
  return { error: null, last4 };
}

export function postTx(input: Omit<BankTx, "id" | "at"> & { at?: string }) {
  const state = loadBank();
  const tx: BankTx = { ...input, id: id("tx"), at: input.at ?? new Date().toISOString() };
  saveBank({ ...state, txs: [tx, ...state.txs] });
  return tx;
}

function applyMove(
  state: BankState,
  userId: string,
  code: MoneyCode,
  delta: number,
  tx: Omit<BankTx, "id" | "at" | "userId" | "currency">,
): { state: BankState; error: string | null } {
  const user = state.users.find((item) => item.id === userId);
  if (!user) return { state, error: "Account not found." };
  const next = user.balances[code] + delta;
  if (next < -0.001) return { state, error: "Not enough balance." };
  const record: BankTx = {
    id: id("tx"),
    userId,
    currency: code,
    at: new Date().toISOString(),
    ...tx,
  };
  const body = `${tx.direction === "in" ? "+" : "−"}${code} ${record.amount.toFixed(2)}. ${tx.detail}`;
  const note: BankNote = {
    id: id("note"),
    userId,
    title: tx.title,
    body,
    at: record.at,
    read: false,
  };
  const event: BankEvent = { id: id("evt"), userId, title: tx.title, body, at: record.at };
  return {
    error: null,
    state: {
      ...state,
      users: state.users.map((item) =>
        item.id === userId
          ? { ...item, balances: { ...item.balances, [code]: Math.round(next * 100) / 100 } }
          : item,
      ),
      txs: [record, ...state.txs],
      notes: alertsOf(user).transfers ? [note, ...state.notes] : state.notes,
      events: [event, ...state.events].slice(0, 40),
    },
  };
}

export function moveMoney(
  userId: string,
  code: MoneyCode,
  delta: number,
  tx: Omit<BankTx, "id" | "at" | "userId" | "currency">,
) {
  const result = applyMove(loadBank(), userId, code, delta, tx);
  if (result.error) return result.error;
  saveBank(result.state);
  return null;
}

export function transferFee(amount: number) {
  return Math.round(amount * 0.01 * 100) / 100;
}

export function payTransfer(userId: string, input: Omit<TransferDraft, "userId">) {
  const detail = `${input.holder} · ${input.bank}${input.note.trim() ? ` · ${input.note.trim()}` : ""}`;
  const fee = transferFee(input.amount);
  let result = applyMove(loadBank(), userId, input.currency, -input.amount, {
    title: "Transfer",
    detail,
    amount: input.amount,
    direction: "out",
  });
  if (result.error) return result.error;
  if (fee > 0) {
    result = applyMove(result.state, userId, input.currency, -fee, {
      title: "Transfer fee",
      detail: "1% of the transfer",
      amount: fee,
      direction: "out",
    });
    if (result.error) return result.error;
  }
  saveBank(result.state);
  return null;
}

export function settleExchange(
  userId: string,
  from: MoneyCode,
  to: MoneyCode,
  debit: number,
  credit: number,
  feeText: string,
) {
  const detail = `${from} to ${to}`;
  let result = applyMove(loadBank(), userId, from, -debit, {
    title: "Exchange out",
    detail: `${detail} · fee ${feeText}`,
    amount: debit,
    direction: "out",
  });
  if (result.error) return result.error;
  result = applyMove(result.state, userId, to, credit, {
    title: "Exchange in",
    detail,
    amount: credit,
    direction: "in",
  });
  if (result.error) return result.error;
  saveBank(result.state);
  return null;
}

export function needsApproval(user: BankUser, total: number) {
  return user.role !== "admin" && total > (user.approvalLimit ?? 10000);
}

export function addSchedule(input: Omit<BankSchedule, "id" | "status">): BankSchedule["status"] {
  const state = loadBank();
  const row: BankSchedule = { ...input, id: id("sch"), status: "scheduled" };
  saveBank({ ...state, schedules: [row, ...state.schedules] });
  if (input.runOn <= new Date().toISOString().slice(0, 10)) runDueSchedules(input.userId);
  return loadBank().schedules.find((item) => item.id === row.id)?.status ?? "scheduled";
}

export function setApprovalLimit(amount: number) {
  const state = loadBank();
  const next = Math.round(Math.max(0, amount) * 100) / 100;
  saveBank({
    ...state,
    users: state.users.map((user) => ({ ...user, approvalLimit: next })),
  });
}

export function cancelSchedule(scheduleId: string) {
  const state = loadBank();
  saveBank({
    ...state,
    schedules: state.schedules.filter((item) => item.id !== scheduleId || item.status !== "scheduled"),
  });
}

function setScheduleStatus(scheduleId: string, status: BankSchedule["status"]) {
  const state = loadBank();
  saveBank({
    ...state,
    schedules: state.schedules.map((item) => (item.id === scheduleId ? { ...item, status } : item)),
  });
}

export function runDueSchedules(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const due = loadBank().schedules.filter(
    (item) => item.userId === userId && item.status === "scheduled" && item.runOn <= today,
  );
  for (const item of due) {
    const user = loadBank().users.find((entry) => entry.id === userId);
    if (!user) continue;
    const total = item.amount + transferFee(item.amount);
    if (needsApproval(user, total)) {
      addApproval({
        userId: item.userId,
        holder: item.holder,
        bank: item.bank,
        routing: item.routing,
        swift: item.swift,
        account: item.account,
        note: item.note,
        amount: item.amount,
        currency: item.currency,
      });
      setScheduleStatus(item.id, "held");
      continue;
    }
    const failed = payTransfer(userId, item);
    setScheduleStatus(item.id, failed ? "failed" : "paid");
  }
}

export function addApproval(input: Omit<BankApproval, "id" | "status" | "at" | "fee">) {
  const state = loadBank();
  const row: BankApproval = {
    ...input,
    id: id("apr"),
    fee: transferFee(input.amount),
    status: "pending",
    at: new Date().toISOString(),
  };
  const recipients = new Set<string>([
    input.userId,
    ...state.users.filter((item) => item.role === "admin").map((item) => item.id),
  ]);
  const waiting = [...recipients].map((userId) => ({
    id: id("note"),
    userId,
    title: "Approval waiting",
    body: `${input.holder} · ${input.currency} ${input.amount.toFixed(2)}`,
    at: row.at,
    read: false,
  }));
  saveBank({ ...state, approvals: [row, ...state.approvals], notes: [...waiting, ...state.notes] });
  return row.id;
}

export function decideApproval(approvalId: string, actorId: string, approve: boolean) {
  const state = loadBank();
  const actor = state.users.find((user) => user.id === actorId);
  if (!actor || actor.role !== "admin") return "Only an admin can decide.";
  const row = state.approvals.find((item) => item.id === approvalId);
  if (!row || row.status !== "pending") return "That transfer is no longer waiting.";
  if (!approve) {
    saveBank({
      ...loadBank(),
      approvals: loadBank().approvals.map((item) =>
        item.id === approvalId ? { ...item, status: "declined" } : item,
      ),
    });
    return null;
  }
  const failed = payTransfer(row.userId, row);
  if (failed) return failed;
  const next = loadBank();
  saveBank({
    ...next,
    approvals: next.approvals.map((item) => (item.id === approvalId ? { ...item, status: "approved" } : item)),
  });
  return null;
}

export function issueApiKey(userId: string) {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const key = `bw_test_${[...bytes].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
  patchUser(userId, { apiKey: key });
  return key;
}

export function inviteMember(input: { name: string; email: string; phone: string; pin: string }) {
  return addUser({ ...input, balance: 0, issueCard: false });
}

export function removeMember(actorId: string, memberId: string) {
  const state = loadBank();
  const actor = state.users.find((user) => user.id === actorId);
  const member = state.users.find((user) => user.id === memberId);
  if (!actor || actor.role !== "admin") return "Only an admin can remove a member.";
  if (!member || member.role !== "member") return "Only a member can be removed.";
  saveBank({
    ...state,
    users: state.users.filter((user) => user.id !== memberId),
    txs: state.txs.filter((tx) => tx.userId !== memberId),
    cards: state.cards.filter((card) => card.userId !== memberId),
    payees: state.payees.filter((payee) => payee.userId !== memberId),
    referrals: state.referrals.filter((item) => item.userId !== memberId),
    events: state.events.filter((item) => item.userId !== memberId),
    schedules: state.schedules.filter((item) => item.userId !== memberId),
    approvals: state.approvals.filter((item) => item.userId !== memberId || item.status !== "pending"),
    notes: state.notes.filter((note) => note.userId !== memberId),
  });
  return null;
}

export function addCard(input: Omit<BankCard, "id">) {
  const state = loadBank();
  const card: BankCard = { ...input, id: id("card") };
  const cards = input.primary
    ? state.cards.map((item) =>
        item.userId === input.userId ? { ...item, primary: false } : item,
      )
    : state.cards;
  saveBank({ ...state, cards: [card, ...cards] });
}

export function removeCard(userId: string, cardId: string) {
  const state = loadBank();
  const card = state.cards.find((item) => item.id === cardId && item.userId === userId);
  if (!card) return;
  let cards = state.cards.filter((item) => item.id !== cardId);
  if (card?.primary) {
    const next = cards.find((item) => item.userId === card.userId);
    if (next) cards = cards.map((item) => (item.id === next.id ? { ...item, primary: true } : item));
  }
  saveBank({ ...state, cards });
}

export function notesFor(state: BankState, userId: string) {
  return state.notes.filter((note) => !note.userId || note.userId === userId);
}

export function markNotes(userId: string, read: boolean) {
  const state = loadBank();
  saveBank({
    ...state,
    notes: state.notes.map((note) => (!note.userId || note.userId === userId ? { ...note, read } : note)),
  });
}

export function markNote(noteId: string, read: boolean) {
  const state = loadBank();
  saveBank({
    ...state,
    notes: state.notes.map((note) => (note.id === noteId ? { ...note, read } : note)),
  });
}

export function addNote(input: { userId: string; title: string; body: string }) {
  const state = loadBank();
  const note: BankNote = {
    id: id("note"),
    userId: input.userId,
    title: input.title,
    body: input.body,
    at: new Date().toISOString(),
    read: false,
  };
  saveBank({ ...state, notes: [note, ...state.notes] });
  return note;
}

export function setCardFrozen(userId: string, cardId: string, frozen: boolean) {
  const state = loadBank();
  if (!state.cards.some((card) => card.id === cardId && card.userId === userId)) return;
  saveBank({
    ...state,
    cards: state.cards.map((card) => (card.id === cardId ? { ...card, frozen } : card)),
  });
}

export function addPayee(input: Omit<BankPayee, "id">) {
  const state = loadBank();
  const existing = state.payees.find(
    (payee) => payee.userId === input.userId && payee.account === input.account && payee.holder === input.holder,
  );
  if (existing) return existing.id;
  const payee: BankPayee = { ...input, id: id("pay") };
  saveBank({ ...state, payees: [payee, ...state.payees] });
  return payee.id;
}

export function removePayee(payeeId: string) {
  const state = loadBank();
  saveBank({ ...state, payees: state.payees.filter((payee) => payee.id !== payeeId) });
}

export function referralCode(user: BankUser) {
  const first = (user.name.split(/\s+/)[0] ?? "Guest").replace(/[^a-z]/gi, "").slice(0, 8).toUpperCase() || "GUEST";
  let hash = 0;
  for (const char of user.id) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  const tail = String(hash % 10000).padStart(4, "0");
  return `BW-${first}-${tail}`;
}

export function addReferral(input: { userId: string; company: string; email: string }) {
  const state = loadBank();
  const company = input.company.trim();
  const email = input.email.trim().toLowerCase();
  const existing = state.referrals.find(
    (item) => item.userId === input.userId && item.email === email,
  );
  if (existing) return "That company is already on this list.";
  const at = new Date().toISOString();
  const row: BankReferral = { id: id("ref"), userId: input.userId, company, email, at, status: "invited", reward: 0 };
  const note: BankNote = {
    id: id("note"),
    userId: input.userId,
    title: "Referral",
    body: `${company} · ${email}`,
    at,
    read: false,
  };
  saveBank({
    ...state,
    referrals: [row, ...state.referrals],
    notes: [note, ...state.notes],
  });
  return null;
}

export function earnReferral(code: string, company: string, email: string) {
  const state = loadBank();
  const owner = state.users.find((user) => referralCode(user) === code.trim().toUpperCase());
  if (!owner) return null;
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized === owner.email.toLowerCase()) return null;
  const name = company.trim() || normalized;
  const existing = state.referrals.find((item) => item.userId === owner.id && item.email === normalized);
  if (existing?.status === "earned") return null;
  const at = new Date().toISOString();
  const referrals = existing
    ? state.referrals.map((item) =>
        item.id === existing.id ? { ...item, company: name, status: "earned" as const, reward: REFERRAL_REWARD } : item,
      )
    : [
        {
          id: id("ref"),
          userId: owner.id,
          company: name,
          email: normalized,
          at,
          status: "earned" as const,
          reward: REFERRAL_REWARD,
        },
        ...state.referrals,
      ];
  const result = applyMove({ ...state, referrals }, owner.id, "USD", REFERRAL_REWARD, {
    title: "Referral reward",
    detail: name,
    amount: REFERRAL_REWARD,
    direction: "in",
  });
  if (result.error) return result.error;
  saveBank(result.state);
  return null;
}

export function goalOf(user: BankUser, code: MoneyCode, kind: "monthlyLimit" | "savingsTarget") {
  const fallback = kind === "monthlyLimit" ? 5000 : 10000;
  const value = user[kind]?.[code];
  return typeof value === "number" && value >= 0 ? value : fallback;
}

export function setGoal(userId: string, kind: "monthlyLimit" | "savingsTarget", code: MoneyCode, amount: number) {
  const state = loadBank();
  const next = Math.round(Math.max(0, amount) * 100) / 100;
  saveBank({
    ...state,
    users: state.users.map((user) =>
      user.id === userId ? { ...user, [kind]: { ...user[kind], [code]: next } } : user,
    ),
  });
}
