"use client";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { expectDeskSync } from "@/lib/desk-sync";
import { firebaseAuth } from "@/lib/firebase";

export type Session = { email: string };

type SessionValue = {
  session: Session | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function authErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found" || code === "auth/invalid-email") {
    return "That email or password does not match.";
  }
  if (code === "auth/email-already-in-use") return "That email already has a sign-in.";
  if (code === "auth/weak-password") return "Password must be at least 8 characters.";
  if (code === "auth/too-many-requests") return "Too many attempts. Wait a moment and try again.";
  if (code === "auth/network-request-failed") return "The sign-in service could not be reached.";
  if (error instanceof Error && error.message) return error.message;
  return "Sign-in did not complete.";
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const auth = firebaseAuth();
    if (!auth) {
      setReady(true);
      return;
    }
    return onAuthStateChanged(auth, (user) => {
      setSession(user?.email ? { email: user.email } : null);
      setReady(true);
    });
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      session,
      ready,
      signIn: async (email: string, password: string) => {
        const auth = firebaseAuth();
        if (!auth) throw new Error("Sign-in did not complete.");
        expectDeskSync();
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      signOut: () => {
        const auth = firebaseAuth();
        setSession(null);
        if (auth) void firebaseSignOut(auth);
      },
    }),
    [ready, session],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used within SessionProvider");
  return value;
}
