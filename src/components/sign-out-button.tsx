"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useSession } from "@/components/session";
import { useI18n } from "@/i18n/provider";

export function SignOutButton({
  className,
  onDone,
}: {
  className?: string;
  onDone?: () => void;
}) {
  const { signOut } = useSession();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {t("Sign out")}
      </button>
      <ConfirmDialog
        open={open}
        title={t("Sign out?")}
        body={t("This session ends on this browser.")}
        confirmLabel={t("Sign out")}
        onClose={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          onDone?.();
          signOut();
        }}
      />
    </>
  );
}
