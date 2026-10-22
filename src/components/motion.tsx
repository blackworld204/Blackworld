"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function Motion() {
  const path = usePathname();

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest("a");
      if (!link || link.target === "_blank") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return;
      const target = document.querySelector(url.hash);
      if (!(target instanceof HTMLElement)) return;
      event.preventDefault();
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.dispatchEvent(new CustomEvent("bw-seek", { detail: { node: target, instant: reduce } }));
      history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frames = 0;
    let frame = 0;
    const tick = () => {
      const target = document.querySelector(hash);
      if (target instanceof HTMLElement) {
        window.dispatchEvent(new CustomEvent("bw-seek", { detail: { node: target, instant: reduce } }));
        return;
      }
      if (frames < 12) {
        frames += 1;
        frame = window.requestAnimationFrame(tick);
      }
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [path]);

  return null;
}
