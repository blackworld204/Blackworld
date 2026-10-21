"use client";

import { useEffect, useState } from "react";

export function toast(message: string) {
  window.dispatchEvent(new CustomEvent("bw-toast", { detail: message }));
}

export function Toaster() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    let timer = 0;
    const onToast = (event: Event) => {
      const next = (event as CustomEvent<string>).detail;
      if (!next) return;
      setMessage(next);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setMessage(""), 3600);
    };
    window.addEventListener("bw-toast", onToast);
    return () => {
      window.removeEventListener("bw-toast", onToast);
      window.clearTimeout(timer);
    };
  }, []);

  if (!message) return null;
  return (
    <p className="toast" role="status">
      {message}
    </p>
  );
}
