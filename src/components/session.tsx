"use client";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
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
import { authReturnSettings, ensureFirebaseAuth, firebaseAuth } from "@/lib/firebase";

export type Session = { email: string };

type SessionValue = {
  session: Session | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function authErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found" || code === "auth/invalid-email" || code === "auth/missing-password") {
    return "That email or password does not match.";
  }
  if (code === "auth/email-already-in-use") return "That email already has a sign-in.";
  if (code === "auth/weak-password") return "Use 8 characters with upper and lower case, a number, and a symbol.";
  if (code === "auth/too-many-requests") return "Too many attempts. Wait a moment and try again.";
  if (code === "auth/user-disabled") return "This account is inactive.";
  if (code === "auth/operation-not-allowed") return "Email sign-in is not available.";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "Google sign-in was cancelled.";
  if (code === "auth/popup-blocked") return "Allow pop-ups to sign in with Google.";
  if (code === "auth/account-exists-with-different-credential") return "That email already uses a password.";
  if (code === "auth/requires-recent-login") return "Sign in again, then retry this change.";
  if (code === "auth/invalid-action-code" || code === "auth/expired-action-code") return "This link has expired. Request a new one.";
  if (code === "auth/invalid-continue-uri" || code === "auth/missing-continue-uri" || code === "auth/unauthorized-continue-uri") {
    return "This site is not allowed to send that link yet.";
  }
  if (code === "auth/network-request-failed" || code === "auth/internal-error") return "The sign-in service could not be reached.";
  if (code === "auth/invalid-api-key" || code.startsWith("auth/api-key-not-valid")) return "Sign-in is not available right now.";
  if (code === "auth/unauthorized-domain") return "This site is not allowed to sign in yet.";
  if (error instanceof Error && error.message && !/Firebase|auth\//.test(error.message)) return error.message;
  return "Sign-in did not complete.";
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stop = false;
    let unsub = () => {};
    void ensureFirebaseAuth().then((auth) => {
      if (stop) return;
      if (!auth) {
        setReady(true);
        return;
      }
      unsub = onAuthStateChanged(auth, (user) => {
        if (stop) return;
        setSession(user?.email ? { email: user.email } : null);
        setReady(true);
      });
    });
    return () => {
      stop = true;
      unsub();
    };
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      session,
      ready,
      signIn: async (email: string, password: string) => {
        const auth = await ensureFirebaseAuth();
        if (!auth) throw new Error("Sign-in is not available right now.");
        expectDeskSync();
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      signUp: async (email: string, password: string) => {
        const auth = await ensureFirebaseAuth();
        if (!auth) throw new Error("Sign-in is not available right now.");
        expectDeskSync();
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (typeof window !== "undefined") {
          await sendEmailVerification(credential.user, authReturnSettings()).catch(() => {});
        }
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
