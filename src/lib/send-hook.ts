import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { BankState } from "@/lib/bank";

function blockedIp(address: string) {
  const mapped = address.startsWith("::ffff:") ? address.slice(7) : address;
  if (mapped === "::1" || mapped === "0.0.0.0") return true;
  const lower = mapped.toLowerCase();
  if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
  const parts = mapped.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

export async function hookAllowed(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) {
    return false;
  }
  if (isIP(host) && blockedIp(host)) return false;
  try {
    const records = await lookup(host, { all: true, verbatim: true });
    if (records.length === 0 || records.some((record) => blockedIp(record.address))) return false;
  } catch {
    return false;
  }
  return true;
}

export async function postHook(raw: string, payload: unknown) {
  if (!(await hookAllowed(raw))) return false;
  const response = await fetch(raw, {
    method: "POST",
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
    headers: { "Content-Type": "application/json", "User-Agent": "Blackworld" },
    body: JSON.stringify(payload),
  }).catch(() => null);
  return Boolean(response && response.status >= 200 && response.status < 300);
}

export async function deliverEvents(state: BankState, eventIds: string[]) {
  const wanted = new Set(eventIds);
  const jobs = state.events.filter((event) => wanted.has(event.id));
  let sent = 0;
  await Promise.all(
    jobs.map(async (event) => {
      const user = state.users.find((item) => item.id === event.userId);
      if (!user?.webhookUrl) return;
      const type = event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "event";
      const ok = await postHook(user.webhookUrl, {
        id: event.id,
        type,
        created: event.at,
        account: event.userId,
        title: event.title,
        body: event.body,
      });
      if (ok) sent += 1;
    }),
  );
  return sent;
}
