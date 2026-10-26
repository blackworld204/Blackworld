"use client";

import { useEffect } from "react";
import { hydrateBank } from "@/lib/bank";
import { firebaseApp, firebaseWebConfig } from "@/lib/firebase";

export function VaultBoot() {
  useEffect(() => {
    void hydrateBank();
    const app = firebaseApp();
    if (!app || !firebaseWebConfig()?.measurementId) return;
    void import("firebase/analytics")
      .then(async ({ getAnalytics, isSupported }) => {
        if (await isSupported()) getAnalytics(app);
      })
      .catch(() => undefined);
  }, []);
  return null;
}
