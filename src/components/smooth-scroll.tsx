"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

function pageScroller() {
  const column = document.querySelector(".app-column");
  if (column instanceof HTMLElement && getComputedStyle(column).overflowY === "auto") return column;
  return document.scrollingElement instanceof HTMLElement ? document.scrollingElement : document.documentElement;
}

function read(el: HTMLElement) {
  return el === document.documentElement || el === document.body ? window.scrollY : el.scrollTop;
}

function write(el: HTMLElement, value: number) {
  el.style.scrollBehavior = "auto";
  el.scrollTop = value;
}

function release(el: HTMLElement) {
  el.style.scrollBehavior = "";
}

function limit(el: HTMLElement) {
  return Math.max(0, el.scrollHeight - el.clientHeight);
}

function nestedScroller(start: EventTarget | null, page: HTMLElement, deltaY: number) {
  let node = start instanceof Element ? start : null;
  while (node && node !== page && node !== document.body && node !== document.documentElement) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
      const atStart = node.scrollTop <= 0;
      const atEnd = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
      if ((deltaY < 0 && !atStart) || (deltaY > 0 && !atEnd)) return node;
    }
    node = node.parentElement;
  }
  return null;
}

export function SmoothScroll() {
  const path = usePathname();

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let current = 0;
    let target = 0;
    let active = false;

    const sync = () => {
      if (active) return;
      const el = pageScroller();
      current = read(el);
      target = current;
    };

    const tick = () => {
      const el = pageScroller();
      target = Math.min(limit(el), Math.max(0, target));
      const next = current + (target - current) * 0.34;
      if (Math.abs(target - next) < 0.5) {
        current = target;
        active = false;
        write(el, current);
        release(el);
        return;
      }
      current = next;
      write(el, current);
      frame = window.requestAnimationFrame(tick);
    };

    const queue = (delta: number) => {
      const el = pageScroller();
      if (!active) {
        current = read(el);
        target = current;
      }
      target = Math.min(limit(el), Math.max(0, target + delta));
      if (active) return;
      active = true;
      frame = window.requestAnimationFrame(tick);
    };

    const onWheel = (event: WheelEvent) => {
      if (media.matches || event.ctrlKey || event.defaultPrevented) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const page = pageScroller();
      const line = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? page.clientHeight : 1;
      const delta = event.deltaY * line;
      if (delta === 0 || nestedScroller(event.target, page, delta)) return;
      event.preventDefault();
      queue(delta);
    };

    const onKey = (event: KeyboardEvent) => {
      if (media.matches || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const focused = event.target;
      if (
        focused instanceof HTMLElement &&
        focused.closest("input, textarea, select, button, a, summary, [contenteditable='true']")
      ) {
        return;
      }
      const page = pageScroller();
      const step = page.clientHeight * 0.86;
      const amount =
        event.key === "ArrowDown" ? 72
        : event.key === "ArrowUp" ? -72
        : event.key === "PageDown" ? step
        : event.key === "PageUp" ? -step
        : event.key === " " ? (event.shiftKey ? -step : step)
        : event.key === "Home" ? -limit(page)
        : event.key === "End" ? limit(page)
        : 0;
      if (!amount) return;
      if (nestedScroller(document.activeElement, page, amount)) return;
      event.preventDefault();
      queue(amount);
    };

    const stop = () => {
      active = false;
      window.cancelAnimationFrame(frame);
      release(pageScroller());
      sync();
    };

    sync();
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", stop);
    document.addEventListener("scroll", sync, { capture: true, passive: true });
    media.addEventListener("change", stop);
    return () => {
      stop();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", stop);
      document.removeEventListener("scroll", sync, true);
      media.removeEventListener("change", stop);
    };
  }, [path]);

  return null;
}
