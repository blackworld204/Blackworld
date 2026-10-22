import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, signOut, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
};

export function firebaseWebConfig(): FirebaseWebConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  if (!apiKey || !authDomain || !projectId || !appId) return null;
  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || undefined,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
  };
}

export function firebaseApp(): FirebaseApp | null {
  const config = firebaseWebConfig();
  if (!config) return null;
  return getApps().length ? getApp() : initializeApp(config);
}

export function firebaseAuth(): Auth | null {
  const app = firebaseApp();
  return app ? getAuth(app) : null;
}

export function firebaseDb(): Firestore | null {
  const app = firebaseApp();
  return app ? getFirestore(app) : null;
}

/** Creates a sign-in on a second app so the current desk session stays signed in. */
export async function createPresentationUser(email: string, password: string) {
  const config = firebaseWebConfig();
  if (!config) throw new Error("The account could not be opened.");
  const name = "blackworld-provision";
  const existing = getApps().find((app) => app.name === name);
  const app = existing ?? initializeApp(config, name);
  const auth = getAuth(app);
  try {
    await createUserWithEmailAndPassword(auth, email.trim(), password);
  } finally {
    await signOut(auth).catch(() => {});
  }
}
