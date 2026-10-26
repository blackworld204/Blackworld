import type { BankNote, BankSchedule, BankState, BankUser } from "@/lib/bank";

function blank(): BankState {
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

function withoutPhoto(user: BankUser): BankUser {
  if (!user.photo) return user;
  const next = { ...user };
  delete next.photo;
  return next;
}

function stripPhotos(state: BankState): BankState {
  return { ...state, users: state.users.map(withoutPhoto) };
}

function sameMail(user: BankUser, email: string) {
  const mail = email.trim().toLowerCase();
  if (!mail || user.email.startsWith("bw1.")) return false;
  return user.email.toLowerCase() === mail || user.pendingEmail === mail;
}

/** The desk a signed-in person is allowed to hold. Admins see every account. */
export function scopeDesk(state: BankState, email: string | null): BankState {
  if (!email) return stripPhotos(state);
  const me = state.users.find((user) => sameMail(user, email));
  if (!me) return blank();
  if (me.role === "admin") return stripPhotos(state);
  const id = me.id;
  const own = <T extends { userId?: string }>(rows: T[]) => rows.filter((row) => row.userId === id);
  return {
    users: [withoutPhoto(me)],
    txs: own(state.txs),
    cards: own(state.cards),
    notes: state.notes.filter((note) => !note.userId || note.userId === id),
    payees: own(state.payees),
    referrals: own(state.referrals),
    schedules: own(state.schedules),
    approvals: own(state.approvals),
    events: own(state.events),
  };
}

function mergeNotes(current: BankNote[], incoming: BankNote[], userId: string) {
  const incomingMine = new Map(
    incoming.filter((note) => note.userId === userId).map((note) => [note.id, note]),
  );
  const others = current.filter((note) => note.userId && note.userId !== userId);
  const shared = current.filter((note) => !note.userId);
  const mine = current
    .filter((note) => note.userId === userId)
    .map((note) => incomingMine.get(note.id) ?? note);
  const known = new Set(mine.map((note) => note.id));
  for (const note of incomingMine.values()) {
    if (!known.has(note.id)) mine.unshift(note);
  }
  return [...mine, ...shared, ...others];
}

function replaceOwned<T extends { id: string; userId: string }>(current: T[], incoming: T[], userId: string) {
  return [...incoming.filter((row) => row.userId === userId), ...current.filter((row) => row.userId !== userId)];
}

function mergeSchedules(current: BankSchedule[], incoming: BankSchedule[], userId: string) {
  const server = new Map(current.filter((row) => row.userId === userId).map((row) => [row.id, row]));
  const mine = incoming
    .filter((row) => row.userId === userId)
    .map((row) => {
      const known = server.get(row.id);
      return known ? { ...row, status: known.status } : row;
    });
  return [...mine, ...current.filter((row) => row.userId !== userId)];
}

/**
 * Folds one member's own profile, cards, and payees onto the server desk.
 * Balances, transfers, and other people stay on the server copy.
 */
export function mergeMember(current: BankState, incoming: BankState, email: string): BankState {
  const incomingUser = incoming.users.find((user) => sameMail(user, email));
  const existing = current.users.find((user) => sameMail(user, email) || user.id === incomingUser?.id);
  if (!incomingUser || !existing) return current;
  const id = existing.id;
  const nextUser: BankUser = {
    ...existing,
    name: incomingUser.name || existing.name,
    phone: incomingUser.phone || existing.phone,
    pin: incomingUser.pin || existing.pin,
    alerts: incomingUser.alerts ?? existing.alerts,
    privacy: incomingUser.privacy ?? existing.privacy,
    address: incomingUser.address ?? existing.address,
    displayCurrency: incomingUser.displayCurrency ?? existing.displayCurrency,
    twoFactor: Boolean(incomingUser.twoFactor),
    totpSecret: incomingUser.totpSecret,
    recoveryCodes: incomingUser.recoveryCodes,
    apiKey: incomingUser.apiKey ?? existing.apiKey,
    webhookUrl: incomingUser.webhookUrl,
    referralId: existing.referralId || incomingUser.referralId,
    pushTokens: incomingUser.pushTokens ?? existing.pushTokens,
    hasPhoto: Boolean(incomingUser.hasPhoto),
    monthlyLimit: incomingUser.monthlyLimit ?? existing.monthlyLimit,
    savingsTarget: incomingUser.savingsTarget ?? existing.savingsTarget,
    photo: undefined,
  };
  return {
    ...current,
    users: current.users.map((user) => (user.id === id ? nextUser : user)),
    cards: replaceOwned(current.cards, incoming.cards, id),
    payees: replaceOwned(current.payees, incoming.payees, id),
    schedules: mergeSchedules(current.schedules, incoming.schedules, id),
    notes: mergeNotes(current.notes, incoming.notes, id),
  };
}
