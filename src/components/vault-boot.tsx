"use client";

import { useEffect } from "react";
import { hydrateBank, loadBank } from "@/lib/bank";
import { stateNeedsOpen } from "@/lib/vault-client";
import { firebaseApp, firebaseWebConfig } from "@/lib/firebase";

export function VaultBoot() {
  useEffect(() => {
    void hydrateBank().then(() => {
      if (stateNeedsOpen(loadBank())) window.dispatchEvent(new Event("bw-desk-open"));
    });
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
