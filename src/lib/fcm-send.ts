import { createSign } from "node:crypto";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

export type PushDelivery = {
  title: string;
  body: string;
  tag: string;
  tokens: string[];
};

let cached: { token: string; exp: number } | null = null;

export function pushDeliveryConfigured() {
  return loadAccount() !== null;
}

function loadAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const json = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(json) as Partial<ServiceAccount>;
    if (!parsed.client_email || !parsed.private_key || !parsed.project_id) return null;
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
      project_id: parsed.project_id,
    };
  } catch {
    return null;
  }
}

function base64url(value: string) {
  return Buffer.from(value).toString("base64url");
}

async function accessToken(account: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const sign = createSign("RSA-SHA256");
  sign.update(unsigned);
  sign.end();
  const assertion = `${unsigned}.${sign.sign(account.private_key).toString("base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = (await response.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null;
  if (!response.ok || !data?.access_token) throw new Error("push-auth");
  cached = { token: data.access_token, exp: now + (data.expires_in ?? 3600) };
  return data.access_token;
}

async function sendOne(projectId: string, token: string, job: { device: string; title: string; body: string; tag: string }) {
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token: job.device,
        data: {
          title: job.title,
          body: job.body,
          tag: job.tag,
          url: "/dashboard/notifications",
        },
        webpush: {
          headers: { Urgency: "high", TTL: "86400" },
          notification: { title: job.title, body: job.body, tag: job.tag },
          fcm_options: { link: "/dashboard/notifications" },
        },
      },
    }),
  });
  if (response.ok) return "sent" as const;
  const detail = await response.text().catch(() => "");
  if (response.status === 404 || detail.includes("UNREGISTERED") || detail.includes("NOT_FOUND")) return "stale" as const;
  return "failed" as const;
}

export async function sendPush(messages: PushDelivery[]) {
  const account = loadAccount();
  if (!account) return { sent: 0, stale: [] as string[], configured: false };
  const jobs = messages.flatMap((message) =>
    message.tokens.map((device) => ({
      device,
      title: message.title,
      body: message.body,
      tag: message.tag,
    })),
  ).slice(0, 100);
  if (jobs.length === 0) return { sent: 0, stale: [] as string[], configured: true };
  const projectId = account.project_id;
  const token = await accessToken(account);
  const stale: string[] = [];
  let sent = 0;
  let cursor = 0;
  async function worker() {
    while (cursor < jobs.length) {
      const job = jobs[cursor];
      cursor += 1;
      if (!job) return;
      const result = await sendOne(projectId, token, job).catch(() => "failed" as const);
      if (result === "sent") sent += 1;
      if (result === "stale") stale.push(job.device);
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, jobs.length) }, () => worker()));
  return { sent, stale, configured: true };
}
