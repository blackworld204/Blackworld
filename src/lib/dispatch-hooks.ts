import { firebaseBearer } from "@/lib/vault-client";

export async function dispatchHooks(eventIds: string[]) {
  const ids = eventIds.filter((id) => /^[a-z0-9_]{4,80}$/i.test(id)).slice(0, 20);
  if (ids.length === 0) return;
  const token = await firebaseBearer();
  if (!token) return;
  await fetch("/api/hooks", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ eventIds: ids }),
  }).catch(() => undefined);
}
