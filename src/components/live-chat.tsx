"use client";

import { useEffect } from "react";
import { useSession } from "@/components/session";
import { TAWK_SRC } from "@/lib/tawk";

type TawkApi = {
  maximize?: () => void;
  showWidget?: () => void;
  setAttributes?: (attrs: Record<string, string>, callback?: (error: unknown) => void) => void;
  addTags?: (tags: string[], callback?: (error: unknown) => void) => void;
  onLoad?: () => void;
};

declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
  }
}

let pendingOpen = false;

function api() {
  window.Tawk_API = window.Tawk_API || {};
  return window.Tawk_API;
}

export function openLiveChat() {
  const chat = api();
  if (!chat.maximize) {
    pendingOpen = true;
    return;
  }
  chat.showWidget?.();
  chat.maximize();
}

export function LiveChat() {
  const { session } = useSession();

  useEffect(() => {
    const chat = api();
    const identify = () => {
      const attrs: Record<string, string> = { product: "Blackworld" };
      if (session?.email) attrs.email = session.email;
      chat.setAttributes?.(attrs, () => {});
      chat.addTags?.(["blackworld"], () => {});
    };
    chat.onLoad = () => {
      identify();
      if (pendingOpen) {
        pendingOpen = false;
        chat.showWidget?.();
        chat.maximize?.();
      }
    };
    identify();

    if (document.getElementById("tawk-embed")) return;
    window.Tawk_LoadStart = new Date();
    const script = document.createElement("script");
    script.id = "tawk-embed";
    script.async = true;
    script.src = TAWK_SRC;
    script.charset = "UTF-8";
    script.crossOrigin = "*";
    document.body.appendChild(script);
  }, [session]);

  return null;
}
