"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/i18n/provider";

export function NoticeDialog({
  open,
  name,
  onClose,
  onSend,
}: {
  open: boolean;
  name: string | null;
  onClose: () => void;
  onSend: (title: string, body: string) => Promise<string | null>;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(false);
  closeRef.current = onClose;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  busyRef.current = busy;

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setBody("");
    setError("");
    setBusy(false);
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLInputElement>("input")?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>("button, input, textarea")].filter((item) => !item.hasAttribute("disabled"));
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="confirm-layer" onMouseDown={() => { if (!busy) onClose(); }}>
      <div
        ref={dialogRef}
        className="balance-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="balance-dialog-head">
          <h2 id={titleId}>{t("Send a notice")}</h2>
          <button type="button" className="balance-close" aria-label={t("Close")} disabled={busy} aria-busy={busy || undefined} onClick={onClose}>
            ×
          </button>
        </div>
        <p className="muted">
          {name
            ? t("It appears on {name}'s desk right away, and as a push alert when push is on.", { name })
            : t("It appears on every account right away, and as a push alert when push is on.")}
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            void onSend(title, body).then((failed) => {
              setBusy(false);
              if (failed) setError(t(failed));
            });
          }}
        >
          <label className="field">
            <span>{t("Title")}</span>
            <input value={title} maxLength={80} disabled={busy} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="field">
            <span>{t("Message")}</span>
            <textarea className="notice-body" value={body} maxLength={400} disabled={busy} onChange={(event) => setBody(event.target.value)} />
          </label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={busy} aria-busy={busy || undefined}>
            {busy ? <span className="btn-spin" aria-hidden="true" /> : null}
            {busy ? t("Sending") : t("Send notice")}
          </button>
          <button className="btn btn-ghost" type="button" disabled={busy} aria-busy={busy || undefined} onClick={onClose}>
            {t("Cancel")}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
