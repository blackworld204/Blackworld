"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "@/components/session";
import { loadBank, subscribeBank, userByEmail, type BankState, type BankUser } from "@/lib/bank";

const BankContext = createContext<BankState | null>(null);

export function BankProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, setState] = useState<BankState | null>(null);

  useEffect(() => {
    const read = () => setState(loadBank());
    read();
    return subscribeBank(read);
  }, [session]);

  return <BankContext.Provider value={state}>{children}</BankContext.Provider>;
}

export function useAccount(): {
  state: BankState | null;
  user: BankUser | null;
} {
  const { session } = useSession();
  const state = useContext(BankContext);
  const user = state && session ? userByEmail(state, session.email) : null;
  return { state, user };
}
