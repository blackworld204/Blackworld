"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "@/components/use-account";
import { runDueSchedules } from "@/lib/bank";

export function DeskRunner() {
  const { user } = useAccount();
  const ran = useRef("");

  useEffect(() => {
    if (!user || ran.current === user.id) return;
    ran.current = user.id;
    void runDueSchedules(user.id);
  }, [user]);

  return null;
}
