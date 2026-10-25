"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/i18n/provider";
import { fetchSharedPhoto } from "@/lib/photos";

function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "?";
}

function PhotoDialog({ open, src, name, onClose }: { open: boolean; src: string; name: string; onClose: () => void }) {
  const { t } = useI18n();
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="confirm-layer photo-layer" onMouseDown={onClose}>
      <div
        className="photo-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="photo-dialog-head">
          <h2 id={titleId}>{name}</h2>
          <button type="button" className="balance-close" aria-label={t("Close")} onClick={onClose}>
            ×
          </button>
        </div>
        <img src={src} alt={t("Profile photo")} />
      </div>
    </div>,
    document.body,
  );
}

export function AccountPhoto({
  userId,
  name,
  photo,
  hasPhoto,
  className = "admin-avatar",
  style,
  viewable = false,
}: {
  userId: string;
  name: string;
  photo?: string;
  hasPhoto?: boolean;
  className?: string;
  style?: React.CSSProperties;
  viewable?: boolean;
}) {
  const { t } = useI18n();
  const inline = photo?.startsWith("data:image/") ? photo : null;
  const [local, setLocal] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const src = inline ?? local;

  useEffect(() => {
    if (inline || !hasPhoto) {
      setLocal(null);
      return;
    }
    let alive = true;
    void (async () => {
      const shared = await fetchSharedPhoto(userId).catch(() => null);
      if (!alive) return;
      if (shared) setLocal(shared);
    })();
    return () => {
      alive = false;
    };
  }, [userId, hasPhoto, inline]);

  const mark = src ? <img src={src} alt="" /> : initials(name);

  if (viewable && src) {
    return (
      <>
        <button
          type="button"
          className={`${className} is-photo`}
          style={style}
          aria-label={t("View photo")}
          onClick={() => setOpen(true)}
        >
          {mark}
        </button>
        <PhotoDialog open={open} src={src} name={name} onClose={() => setOpen(false)} />
      </>
    );
  }

  return (
    <span className={className} style={style} aria-hidden="true">
      {mark}
    </span>
  );
}
