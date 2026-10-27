"use client";

import { useState } from "react";
import { BusyButton } from "@/components/busy-button";
import { toast } from "@/components/toast";
import { useI18n } from "@/i18n/provider";
import { addNote, alertsOf, patchUser, type BankUser } from "@/lib/bank";

function digits(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

export function SetPinForm({
  user,
  onDone,
}: {
  user: BankUser;
  onDone?: () => void;
}) {
  const { t } = useI18n();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!/^\d{4}$/.test(pin)) {
      setError(t("PIN must be 4 digits."));
      return;
    }
    if (pin !== confirm) {
      setError(t("PIN entries do not match."));
      return;
    }
    setError("");
    setBusy(true);
    try {
      patchUser(user.id, { pin });
      if (alertsOf(user).security) {
        addNote({
          userId: user.id,
          title: "PIN updated",
          body: "The transfer PIN for this account was set.",
        });
      }
      toast(t("PIN saved."));
      onDone?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={save}>
      <label className="field">
        <span>{t("4-digit PIN")}</span>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          maxLength={4}
          value={pin}
          aria-invalid={Boolean(error)}
          onChange={(event) => {
            setPin(digits(event.target.value));
            setError("");
          }}
        />
      </label>
      <label className="field">
        <span>{t("Confirm PIN")}</span>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          maxLength={4}
          value={confirm}
          aria-invalid={Boolean(error)}
          onChange={(event) => {
            setConfirm(digits(event.target.value));
            setError("");
          }}
        />
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <BusyButton className="btn btn-primary" type="submit" busy={busy}>
        {t("Save PIN")}
      </BusyButton>
    </form>
  );
}
