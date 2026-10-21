"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Session = { email: string };

type SessionValue = {
  session: Session | null;
  ready: boolean;
  signIn: (email: string) => void;
  signOut: () => void;
};

const KEY = "blackworld-session";
const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Session;
        if (parsed?.email) setSession({ email: parsed.email });
      }
    } catch {
      localStorage.removeItem(KEY);
    }
    setReady(true);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      session,
      ready,
      signIn: (email: string) => {
        const next = { email };
        localStorage.setItem(KEY, JSON.stringify(next));
        setSession(next);
      },
      signOut: () => {
        localStorage.removeItem(KEY);
        setSession(null);
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
