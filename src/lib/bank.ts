import { CURRENCIES, balancesOf, emptyBalances, isMoneyCode, type MoneyCode } from "@/lib/currencies";
import { isSealed } from "@/lib/sealed";
import { dispatchHooks } from "@/lib/dispatch-hooks";
import { currentRevision, openRemote, sealRemote, stateNeedsOpen } from "@/lib/vault-client";

function storedText(value: unknown) {
  if (isSealed(value)) return value;
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
}

function referralToken(value: unknown) {
  if (typeof value !== "string" || value.length === 0) return undefined;
  if (isSealed(value) || /^BW-[A-F0-9]{32}$/.test(value)) return value;
  return undefined;
}

function storedPhoto(value: unknown) {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("data:image/jpeg;base64,")) return undefined;
  if (value.length > 180_000) return undefined;
  return value;
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
  referralId?: string;
  /** Referral code used when this account was opened. The reward waits for a deposit. */
  referredBy?: string;
  recoveryCodes?: string[];
  alerts?: AlertPrefs;
  privacy?: PrivacyPrefs;
  hasPhoto?: boolean;
  photo?: string;
  address?: BankAddress;
  pushTokens?: string[];
  /** Address waiting on the email-change link. Sign-in claims it once Firebase accepts it. */
  pendingEmail?: string;
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
  ref?: string;
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
  spendLimit?: number;
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

export type NoteChannel = "admin" | "transfer" | "security" | "statement";

export type BankNote = {
  id: string;
  userId?: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  channel?: NoteChannel;
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
  ref?: string;
  /** A deposit waits for an admin before any balance changes. */
  kind?: "transfer" | "deposit";
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

type BankPersist = (state: BankState) => void;
let persistBank: BankPersist | null = null;
let applyingRemote = false;

export function setBankPersist(fn: BankPersist | null) {
  persistBank = fn;
}

export function emptyBank(): BankState {
  return {
    users: [],
    txs: [],
    cards: [],
    notes: [],
    payees: [],
    referrals: [],
    schedules: [],
    approvals: [],
    events: [],
  };
}

export function normalizeBank(parsed: Partial<BankState>): BankState {
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
    photo: storedPhoto(user.photo),
    hasPhoto: Boolean(user.hasPhoto) || Boolean(storedPhoto(user.photo)),
    balances: isSealed(user.balances) ? user.balances : balancesOf(user.balances),
    displayCurrency: user.displayCurrency && isMoneyCode(user.displayCurrency) ? user.displayCurrency : "USD",
    approvalLimit: typeof user.approvalLimit === "number" ? user.approvalLimit : 10000,
    apiKey: storedText(user.apiKey),
    pushTokens: Array.isArray(user.pushTokens)
      ? user.pushTokens.filter((token) => typeof token === "string" && token.length > 0).slice(-8)
      : undefined,
    referredBy: referralToken(user.referredBy),
    pendingEmail:
      typeof user.pendingEmail === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.pendingEmail)
        ? user.pendingEmail.toLowerCase()
        : undefined,
  }));
  const placeholderEmails = new Set(["johnsmith@gmail.com", "jordan.lee@blackworld.com"]);
  const readableMail = (email: string) => (email.startsWith("bw1.") ? "" : email.toLowerCase());
  const placeholderIds = new Set(users.filter((user) => placeholderEmails.has(readableMail(user.email))).map((user) => user.id));
  const keptUsers = users.filter((user) => !placeholderIds.has(user.id));
  const owned = <T extends { userId?: string }>(rows: T[]) => rows.filter((row) => !row.userId || !placeholderIds.has(row.userId));
  const txs = owned(parsed.txs ?? []);
  const cards = owned((parsed.cards ?? []).map((card) => ({
    ...card,
    frozen: Boolean(card.frozen),
    kind: card.kind === "physical" || card.kind === "virtual" ? card.kind : card.primary ? "physical" : "virtual",
  })));
  const payees = owned(Array.isArray(parsed.payees) ? parsed.payees : []);
  const notes = owned((parsed.notes ?? []).map((note) => ({
    ...note,
    userId: typeof note.userId === "string" ? note.userId : undefined,
    channel:
      note.channel === "admin" || note.channel === "transfer" || note.channel === "security" || note.channel === "statement"
        ? note.channel
        : undefined,
  }))).filter((note) => note.id !== "note_deposit_bw" && note.id !== "note_admin_bw");
  return {
    users: keptUsers,
    txs,
    cards,
    notes,
    payees,
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
let commitSerial = 0;
let replaceSerial = 0;
const heldLive = new Map<string, BankNote>();
const quietNotes = new Set<string>();

/** Notes older than this were already on the desk. They fill the list without a new alert. */
const LIVE_ALERT_MS = 15 * 60_000;

export function noteIsQuiet(id: string) {
  return quietNotes.has(id);
}

function dropStoredCopy() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function loadBank(): BankState {
  return memory ?? emptyBank();
}

/** The open tab keeps the latest Firebase desk in memory. Nothing is saved in the browser. */
export function hydrateBank() {
  dropStoredCopy();
  if (memory && memory.users.length > 0 && !stateNeedsOpen(memory)) return Promise.resolve(memory);
  return Promise.resolve(loadBank());
}

export function saveBank(next: BankState) {
  const prior = memory;
  const clean = normalizeBank(next);
  const fresh = prior
    ? clean.events.filter((event) => !prior.events.some((item) => item.id === event.id)).map((event) => event.id)
    : [];
  memory = clean;
  window.dispatchEvent(new Event(EVENT));
  if (applyingRemote || stateNeedsOpen(clean)) return;
  const serial = ++commitSerial;
  void sealRemote(clean).then(async (sealed) => {
    if (serial !== commitSerial) return;
    let saved = sealed ?? (await sealRemote(clean));
    if (serial !== commitSerial) return;
    if (!saved) {
      try {
        await persistBank?.(clean);
      } catch {
        /* This tab still has the desk. The next change tries the save again. */
      }
      return;
    }
    const sealedResult = saved;
    if (sealedResult.kind === "conflict") {
      void replaceBank(sealedResult.state);
      return;
    }
    if (sealedResult.revision < (currentRevision() ?? sealedResult.revision)) return;
    try {
      await persistBank?.(sealedResult.state);
    } catch {
      /* This tab still has the desk. The next change tries the save again. */
    }
    if (fresh.length) void dispatchHooks(fresh);
  });
}

function withHeld(state: BankState) {
  const ids = new Set(state.notes.map((note) => note.id));
  const extra = [...heldLive.values()].filter((note) => !ids.has(note.id));
  for (const note of heldLive.values()) {
    if (ids.has(note.id)) heldLive.delete(note.id);
  }
  if (extra.length === 0) return state;
  return { ...state, notes: [...extra, ...state.notes] };
}

let noteMerges = 0;

function persistMerged(changed: boolean) {
  if (!changed || !memory || noteMerges > 3) return;
  noteMerges += 1;
  saveBank(memory);
}

/** Notices that arrived from Firebase while this desk copy was loading. */
function keepRecentNotes(_previous: BankState | null, remote: BankState) {
  return withHeld(remote);
}

export async function replaceBank(incoming: BankState, token?: string) {
  const ticket = ++replaceSerial;
  commitSerial += 1;
  const raw = JSON.parse(JSON.stringify(incoming)) as BankState;
  if (!stateNeedsOpen(raw)) {
    const stored = normalizeBank(raw);
    if (ticket !== replaceSerial) return;
    applyingRemote = true;
    let changed = false;
    try {
      const merged = keepRecentNotes(memory, stored);
      changed = merged.notes.length !== stored.notes.length;
      memory = merged;
      if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
    } finally {
      applyingRemote = false;
    }
    persistMerged(changed);
    return;
  }
  let opened = await openRemote(raw, token);
  if (ticket !== replaceSerial) return;
  if (!opened || stateNeedsOpen(opened)) opened = await openRemote(raw, token);
  if (ticket !== replaceSerial) return;
  const readable = opened && !stateNeedsOpen(opened) ? opened : raw;
  if (stateNeedsOpen(readable) && !readable.users.some((user) => !user.email.startsWith("bw1."))) return;
  applyingRemote = true;
  let changed = false;
  try {
    const remote = normalizeBank(readable);
    const merged = keepRecentNotes(memory, remote);
    changed = merged.notes.length !== remote.notes.length;
    memory = merged;
    if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
  } finally {
    applyingRemote = false;
  }
  persistMerged(changed);
}

/** Merges an admin notice into this desk immediately, before the full desk copy arrives. */
export function receiveLiveNotes(notes: BankNote[], email: string) {
  if (typeof window === "undefined" || notes.length === 0) return;
  const state = loadBank();
  const user = userByEmail(state, email);
  if (!user) return;
  const now = Date.now();
  const mine = notes.filter((note) => note.userId === user.id);
  for (const note of mine) {
    heldLive.set(note.id, note);
    const at = Date.parse(note.at);
    if (!Number.isFinite(at) || now - at > LIVE_ALERT_MS) quietNotes.add(note.id);
  }
  const known = new Set(state.notes.map((note) => note.id));
  const fresh = mine.filter((note) => !known.has(note.id));
  if (fresh.length === 0) return;
  commitSerial += 1;
  applyingRemote = true;
  try {
    memory = normalizeBank({ ...state, notes: [...fresh, ...state.notes] });
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
  const needle = email.toLowerCase();
  return state.users.find((user) => !user.email.startsWith("bw1.") && user.email.toLowerCase() === needle) ?? null;
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

export function forgetPushTokens(tokens: string[]) {
  const drop = new Set(tokens.filter(Boolean));
  if (drop.size === 0) return;
  const state = loadBank();
  let changed = false;
  const users = state.users.map((user) => {
    if (!user.pushTokens?.some((token) => drop.has(token))) return user;
    changed = true;
    return { ...user, pushTokens: user.pushTokens.filter((token) => !drop.has(token)) };
  });
  if (changed) saveBank({ ...state, users });
}

export function patchUser(userId: string, patch: Partial<BankUser>) {
  const safe = { ...patch };
  delete safe.role;
  delete safe.status;
  delete safe.canCreate;
  delete safe.balances;
  delete safe.email;
  delete safe.pendingEmail;
  delete safe.id;
  const state = loadBank();
  saveBank({
    ...state,
    users: state.users.map((user) => (user.id === userId ? { ...user, ...safe } : user)),
  });
}

export function stageEmailChange(userId: string, nextEmail: string) {
  const next = nextEmail.trim().toLowerCase();
  const state = loadBank();
  const owner = state.users.find((user) => user.id === userId);
  if (!owner) return "Account not found.";
  if (owner.email.toLowerCase() === next) return "That is already the address on this account.";
  if (
    state.users.some(
      (user) => user.id !== userId && !user.email.startsWith("bw1.") && (user.email.toLowerCase() === next || user.pendingEmail === next),
    )
  ) {
    return "That email already has an account.";
  }
  saveBank({
    ...state,
    users: state.users.map((user) => (user.id === userId ? { ...user, pendingEmail: next } : user)),
  });
  return null;
}

export function clearStagedEmail(userId: string) {
  const state = loadBank();
  saveBank({
    ...state,
    users: state.users.map((user) => (user.id === userId ? { ...user, pendingEmail: undefined } : user)),
  });
}

/** Moves the desk address after Firebase accepts the change, or claims a staged address. */
export function changeUserEmail(from: string, to: string) {
  const next = to.trim().toLowerCase();
  const prev = from.trim().toLowerCase();
  if (!next || !prev) return "Enter an email.";
  const state = loadBank();
  if (prev === next) {
    const same = state.users.find((user) => user.email.toLowerCase() === next);
    if (same?.pendingEmail) {
      saveBank({
        ...state,
        users: state.users.map((user) => (user.id === same.id ? { ...user, pendingEmail: undefined } : user)),
      });
    }
    return null;
  }
  const owner = state.users.find((user) => !user.email.startsWith("bw1.") && user.email.toLowerCase() === prev);
  if (!owner) return "Account not found.";
  if (state.users.some((user) => user.id !== owner.id && !user.email.startsWith("bw1.") && user.email.toLowerCase() === next)) {
    return "That email already has an account.";
  }
  saveBank({
    ...state,
    users: state.users.map((user) => (user.id === owner.id ? { ...user, email: next, pendingEmail: undefined } : user)),
  });
  return null;
}

export function claimStagedEmail(signedInEmail: string) {
  const email = signedInEmail.trim().toLowerCase();
  if (!email) return;
  const state = loadBank();
  const current = userByEmail(state, email);
  if (current) {
    if (current.pendingEmail) {
      saveBank({
        ...state,
        users: state.users.map((user) => (user.id === current.id ? { ...user, pendingEmail: undefined } : user)),
      });
    }
    return;
  }
  const staged = state.users.find((user) => user.pendingEmail === email);
  if (!staged) return;
  changeUserEmail(staged.email, email);
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
  const user = state.users.find((item) => item.id === userId);
  if (!user) return "Account not found.";
  const digits = code === "JPY" ? 0 : 2;
  const factor = 10 ** digits;
  const next = Math.round(Math.max(0, nextAmount) * factor) / factor;
  const current = Math.round(user.balances[code] * factor) / factor;
  const delta = Math.round((next - current) * factor) / factor;
  if (delta === 0) return null;
  const result = applyMove(state, userId, code, delta, {
    title: delta > 0 ? "Account credit" : "Account debit",
    detail: "Adjusted by an administrator",
    amount: Math.abs(delta),
    direction: delta > 0 ? "in" : "out",
  });
  if (result.error) return result.error;
  saveBank(result.state);
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
  const requested = input.email.toLowerCase();
  if (
    state.users.some(
      (user) =>
        !user.email.startsWith("bw1.") &&
        (user.email.toLowerCase() === requested || user.pendingEmail === requested),
    )
  ) {
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

export function depositBreakdown(amount: number) {
  const fee = Math.round(amount * 0.025 * 100) / 100;
  const credit = Math.round((amount - fee) * 100) / 100;
  return { fee, credit };
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

export async function addSchedule(input: Omit<BankSchedule, "id" | "status">): Promise<BankSchedule["status"]> {
  const state = loadBank();
  const row: BankSchedule = { ...input, id: id("sch"), status: "scheduled" };
  saveBank({ ...state, schedules: [row, ...state.schedules] });
  if (input.runOn <= new Date().toISOString().slice(0, 10)) await runDueSchedules(input.userId);
  return loadBank().schedules.find((item) => item.id === row.id)?.status ?? "scheduled";
}

export function setApprovalLimit(userId: string, amount: number) {
  const state = loadBank();
  const next = Math.round(Math.max(0, amount) * 100) / 100;
  if (!state.users.some((user) => user.id === userId)) return "Account not found.";
  saveBank({
    ...state,
    users: state.users.map((user) => (user.id === userId ? { ...user, approvalLimit: next } : user)),
  });
  return null;
}

export function cancelSchedule(scheduleId: string) {
  const state = loadBank();
  saveBank({
    ...state,
    schedules: state.schedules.filter((item) => item.id !== scheduleId || item.status !== "scheduled"),
  });
}

function rememberSchedule(item: BankSchedule, status: BankSchedule["status"]) {
  const current = loadBank();
  const existing = current.schedules.some((row) => row.id === item.id);
  const schedules = existing
    ? current.schedules.map((row) => (row.id === item.id ? { ...row, status } : row))
    : [{ ...item, status }, ...current.schedules];
  saveBank({ ...current, schedules });
}

export async function runDueSchedules(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const due = loadBank().schedules.filter(
    (item) => item.userId === userId && item.status === "scheduled" && item.runOn <= today,
  );
  if (due.length === 0) return;
  const { postAccount } = await import("@/lib/flow-api");
  for (const item of due) {
    const result = await postAccount<{ status?: string }>("payments", {
      holder: item.holder,
      bank: item.bank,
      routing: item.routing,
      swift: item.swift,
      account: item.account,
      note: item.note,
      amount: item.amount,
      currency: item.currency,
      ref: item.id,
    });
    if (result.status === 0 || !result.synced) continue;
    if (result.error) {
      rememberSchedule(item, "failed");
      continue;
    }
    rememberSchedule(item, result.body?.status === "pending" ? "held" : "paid");
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
  if (row.kind === "deposit") {
    const net = Math.round((row.amount - row.fee) * 100) / 100;
    const failed = moveMoney(row.userId, "USD", net, {
      title: row.holder,
      detail: `Fee USD ${row.fee.toFixed(2)}`,
      amount: net,
      direction: "in",
    });
    if (failed) return failed;
    const payer = loadBank().users.find((user) => user.id === row.userId);
    const rewarded = payer ? payReferralOnDeposit(loadBank(), payer) : null;
    if (rewarded) saveBank(rewarded.state);
    const next = loadBank();
    saveBank({
      ...next,
      approvals: next.approvals.map((item) => (item.id === approvalId ? { ...item, status: "approved" } : item)),
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

export function cardSpendAmount(raw: string): { error: string } | { amount: number | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { amount: null };
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) return { error: "Enter a spend limit, or leave it blank." };
  return { amount: Math.round(value * 100) / 100 };
}

export function cardDraftError(input: { holder: string; last4: string; expiry: string }) {
  if (input.holder.trim().length < 2) return "Enter the name on the card.";
  if (!/^\d{4}$/.test(input.last4)) return "Enter the last 4 digits.";
  if (!/^\d{2}\/\d{2}$/.test(input.expiry)) return "Use expiry as MM/YY.";
  const month = Number(input.expiry.slice(0, 2));
  if (month < 1 || month > 12) return "Use expiry as MM/YY.";
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

export function updateCard(
  userId: string,
  cardId: string,
  patch: {
    holder: string;
    last4: string;
    expiry: string;
    kind: "virtual" | "physical";
    primary: boolean;
    spendLimit: number | null;
  },
) {
  const state = loadBank();
  const current = state.cards.find((card) => card.id === cardId && card.userId === userId);
  if (!current) return "Card not found.";
  const others = state.cards.filter((card) => card.userId === userId && card.id !== cardId);
  const primary = patch.primary || !others.some((card) => card.primary);
  const cards = state.cards.map((card) => {
    if (card.userId === userId && card.id !== cardId && primary) return { ...card, primary: false };
    if (card.id !== cardId) return card;
    return {
      ...card,
      holder: patch.holder.trim().toUpperCase(),
      last4: patch.last4,
      expiry: patch.expiry,
      kind: patch.kind,
      primary,
      spendLimit: patch.spendLimit === null ? undefined : patch.spendLimit,
    };
  });
  saveBank({ ...state, cards });
  return null;
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

export function addNote(input: { userId: string; title: string; body: string; channel?: NoteChannel }) {
  const state = loadBank();
  const note: BankNote = {
    id: id("note"),
    userId: input.userId,
    title: input.title,
    body: input.body,
    at: new Date().toISOString(),
    read: false,
    channel: input.channel,
  };
  saveBank({ ...state, notes: [note, ...state.notes] });
  return note;
}

function deviceTokens(user: BankUser) {
  const plain: string[] = [];
  for (const token of user.pushTokens ?? []) {
    if (token.startsWith("bw1.") || token.length < 20 || token.length > 4096) continue;
    plain.push(token);
  }
  return plain;
}

/** Writes one unread notice per account. Open desks see it through the live desk sync. */
export function postAdminNotice(
  actorId: string,
  input: { userIds: string[] | "all"; title: string; body: string },
): { error: string } | { error: null; title: string; body: string; deliveries: { tag: string; tokens: string[] }[] } {
  const state = loadBank();
  if (!actingAdmin(state, actorId)) return { error: "Only an admin can send a notice." };
  const title = input.title.trim();
  const body = input.body.trim();
  if (title.length < 2 || title.length > 80) return { error: "Enter a title." };
  if (body.length < 2 || body.length > 400) return { error: "Enter a message." };
  const targets = input.userIds === "all" ? state.users : state.users.filter((user) => input.userIds.includes(user.id));
  if (targets.length === 0) return { error: "Choose an account." };
  const at = new Date().toISOString();
  const rows = targets.map((user) => {
    const note: BankNote = {
      id: id("note"),
      userId: user.id,
      title,
      body,
      at,
      read: false,
      channel: "admin",
    };
    return { note, tokens: deviceTokens(user) };
  });
  const notes = rows.map((row) => row.note);
  saveBank({ ...state, notes: [...notes, ...state.notes] });
  void import("@/lib/live-notice").then((mod) => mod.publishLiveNotices(notes)).catch(() => undefined);
  return {
    error: null,
    title,
    body,
    deliveries: rows.map((row) => ({ tag: row.note.id, tokens: row.tokens })),
  };
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

export const REFERRAL_CODE = /^BW-[A-F0-9]{32}$/;

export function ensureReferralCode(userId: string) {
  const user = loadBank().users.find((item) => item.id === userId);
  if (!user || user.status !== "active") return "";
  if (user.referralId && REFERRAL_CODE.test(user.referralId)) return user.referralId;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const code = `BW-${[...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
  patchUser(userId, { referralId: code });
  return code;
}

export function referralCode(user: BankUser) {
  if (user.referralId && REFERRAL_CODE.test(user.referralId)) return user.referralId;
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

/** Credits the referrer on a desk copy. Returns null when the code, email, or reward does not apply. */
export function creditReferral(state: BankState, code: string, company: string, email: string) {
  const token = code.trim().toUpperCase();
  if (!REFERRAL_CODE.test(token)) return null;
  const owner = state.users.find((user) => user.status === "active" && user.referralId?.toUpperCase() === token);
  if (!owner) return null;
  const normalized = email.trim().toLowerCase();
  if (!normalized || owner.email.startsWith("bw1.") || normalized === owner.email.toLowerCase()) return null;
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const recent = state.txs.filter((tx) => tx.title === "Referral reward" && Date.parse(tx.at) > hourAgo).length;
  if (recent >= 8) return null;
  if (state.referrals.some((item) => !item.email.startsWith("bw1.") && item.email.toLowerCase() === normalized && item.status === "earned")) return null;
  const name = company.trim() || normalized;
  const existing = state.referrals.find((item) => item.userId === owner.id && !item.email.startsWith("bw1.") && item.email.toLowerCase() === normalized);
  if (existing?.status === "earned") return null;
  const at = new Date().toISOString();
  const referrals = existing
    ? state.referrals.map((item) =>
        item.id === existing.id
          ? { ...item, company: existing.company || name, status: "earned" as const, reward: REFERRAL_REWARD }
          : item,
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
  if (result.error) return null;
  const eventId = result.state.events[0]?.id;
  if (!eventId) return null;
  return { state: result.state, eventId };
}

/** Records an invite without paying. The reward is credited on the invitee's first deposit. */
export function attachReferral(state: BankState, code: string, company: string, email: string): BankState | null {
  const token = code.trim().toUpperCase();
  if (!REFERRAL_CODE.test(token)) return null;
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized.startsWith("bw1.")) return null;
  const owner = state.users.find((user) => user.status === "active" && user.referralId?.toUpperCase() === token);
  if (owner && normalized === owner.email.toLowerCase()) return null;
  const earned = state.referrals.some(
    (item) => !item.email.startsWith("bw1.") && item.email.toLowerCase() === normalized && item.status === "earned",
  );
  const users = state.users.map((user) =>
    !user.email.startsWith("bw1.") && user.email.toLowerCase() === normalized && user.referredBy !== token
      ? { ...user, referredBy: token }
      : user,
  );
  const stamped = users.some((user, index) => user !== state.users[index]);
  if (!owner || earned) return stamped ? { ...state, users } : null;
  const existing = state.referrals.find(
    (item) => item.userId === owner.id && !item.email.startsWith("bw1.") && item.email.toLowerCase() === normalized,
  );
  if (existing) return stamped ? { ...state, users } : null;
  const row: BankReferral = {
    id: id("ref"),
    userId: owner.id,
    company: company.trim() || normalized,
    email: normalized,
    at: new Date().toISOString(),
    status: "invited",
    reward: 0,
  };
  return { ...state, users, referrals: [row, ...state.referrals] };
}

export function linkReferral(code: string, company: string, email: string) {
  const next = attachReferral(loadBank(), code, company, email);
  if (next) saveBank(next);
}

/** Pays the referrer once, on the invited account's deposit. */
export function payReferralOnDeposit(state: BankState, depositor: BankUser) {
  const email = depositor.email.trim().toLowerCase();
  if (!email || email.startsWith("bw1.")) return null;
  const code = depositor.referredBy && REFERRAL_CODE.test(depositor.referredBy) ? depositor.referredBy : "";
  if (code) {
    const paid = creditReferral(state, code, depositor.name, email);
    if (paid) return paid;
    const named = state.users.some((user) => user.referralId?.toUpperCase() === code);
    if (named) return null;
  }
  const pending = state.referrals.find(
    (item) => item.status === "invited" && !item.email.startsWith("bw1.") && item.email.toLowerCase() === email,
  );
  if (!pending) return null;
  const owner = state.users.find((user) => user.id === pending.userId && user.status === "active");
  const ownerCode = owner?.referralId?.toUpperCase() ?? "";
  if (!REFERRAL_CODE.test(ownerCode) || ownerCode === code) return null;
  return creditReferral(state, ownerCode, pending.company || depositor.name, email);
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
