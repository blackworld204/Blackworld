import { firebaseAuth } from "@/lib/firebase";

export type PushReceipt = {
  sent: number;
  stale: string[];
  configured: boolean;
  failed: boolean;
};

export async function deliverPush(messages: { title: string; body: string; tag: string; tokens: string[] }[]): Promise<PushReceipt> {
  const pending = messages.filter((message) => message.tokens.length > 0);
  if (pending.length === 0) return { sent: 0, stale: [], configured: true, failed: false };
  const user = firebaseAuth()?.currentUser;
  if (!user) return { sent: 0, stale: [], configured: false, failed: true };
  const send = (token: string) =>
    fetch("/api/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages: pending }),
    }).catch(() => null);
  let response = await send(await user.getIdToken());
  if (response?.status === 403) response = await send(await user.getIdToken(true));
  if (!response) return { sent: 0, stale: [], configured: false, failed: true };
  const data = (await response.json().catch(() => null)) as { sent?: number; stale?: string[]; configured?: boolean } | null;
  if (!response.ok || !data) return { sent: 0, stale: [], configured: false, failed: true };
  return {
    sent: typeof data.sent === "number" ? data.sent : 0,
    stale: Array.isArray(data.stale) ? data.stale.filter((token) => typeof token === "string") : [],
    configured: data.configured !== false,
    failed: false,
  };
}
