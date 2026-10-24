"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "@/components/use-account";
import { postAccount } from "@/lib/flow-api";

export function DeskRunner() {
  const { user } = useAccount();
  const ran = useRef(false);

  useEffect(() => {
    if (!user || ran.current) return;
    ran.current = true;
    void postAccount("schedules/run", {});
  }, [user]);

  return null;
}
