const DB = "blackworld-files";
const STORE = "photos";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePhoto(userId: string, file: Blob) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(file, userId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadPhotoBlob(userId: string) {
  const db = await openDb();
  const file = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(userId);
    request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return file;
}

export async function loadPhoto(userId: string) {
  const file = await loadPhotoBlob(userId);
  return file ? URL.createObjectURL(file) : null;
}

/** A small JPEG the desk can carry, so an admin on another browser can see it. */
export async function photoDataUrl(file: Blob) {
  const bitmap = await createImageBitmap(file);
  const max = 480;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("photo");
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let quality = 0.82;
  let url = canvas.toDataURL("image/jpeg", quality);
  while (url.length > 140_000 && quality > 0.5) {
    quality -= 0.12;
    url = canvas.toDataURL("image/jpeg", quality);
  }
  if (!url.startsWith("data:image/jpeg") || url.length > 180_000) throw new Error("photo");
  return url;
}

async function photoAuth() {
  const { firebaseBearer } = await import("@/lib/vault-client");
  const token = await firebaseBearer();
  if (!token) throw new Error("photo");
  return token;
}

export async function publishPhoto(image: string) {
  const token = await photoAuth();
  const response = await fetch("/api/photos", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ image }),
  });
  if (!response.ok) throw new Error("photo");
}

export async function withdrawPhoto() {
  const token = await photoAuth();
  const response = await fetch("/api/photos", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("photo");
}

export async function fetchSharedPhoto(userId: string) {
  const token = await photoAuth().catch(() => "");
  if (!token) return null;
  const response = await fetch(`/api/photos?userId=${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) return null;
  const data = (await response.json().catch(() => null)) as { image?: unknown } | null;
  return typeof data?.image === "string" && data.image.startsWith("data:image/jpeg") ? data.image : null;
}

export async function clearPhoto(userId: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(userId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
