"use client";

import { useEffect } from "react";
import { useSession } from "@/components/session";
import { startDeskSync } from "@/lib/desk-sync";

export function DeskSync() {
  const { session } = useSession();

  useEffect(() => {
    if (!session) return;
    return startDeskSync();
  }, [session]);

  return null;
}
