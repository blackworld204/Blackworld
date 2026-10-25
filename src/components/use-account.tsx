"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "@/components/session";
import { claimStagedEmail, hydrateBank, loadBank, subscribeBank, userByEmail, type BankState, type BankUser } from "@/lib/bank";
import { claimDeskAccount } from "@/lib/desk-sync";
import { firebaseBearer } from "@/lib/vault-client";

const BankContext = createContext<BankState | null>(null);

export function BankProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, setState] = useState<BankState | null>(null);

  useEffect(() => {
    let stop = false;
    const read = () => {
      if (!stop) setState(loadBank());
    };
    void hydrateBank().then(async () => {
      if (session?.email) {
        claimStagedEmail(session.email);
        if (!userByEmail(loadBank(), session.email)) {
          const token = await firebaseBearer();
          if (token) await claimDeskAccount(token);
          claimStagedEmail(session.email);
        }
      }
      read();
    });
    const unsub = subscribeBank(read);
    return () => {
      stop = true;
      unsub();
    };
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
