"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/components/session";

export function RequireSession({ children }: { children: React.ReactNode }) {
  const { session, ready } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (ready && !session) router.replace("/login");
  }, [ready, session, router]);

  if (!ready || !session) return null;
  return children;
}
