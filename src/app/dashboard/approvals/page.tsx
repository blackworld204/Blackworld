"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "@/components/toast";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { decideApproval, money, when } from "@/lib/bank";
import { postAccount } from "@/lib/flow-api";

export default function ApprovalsPage() {
  const { state, user } = useAccount();
  const { t, locale } = useI18n();
  const [ask, setAsk] = useState<{ id: string; approve: boolean; holder: string; total: string } | null>(null);

  if (!state || !user) return <div className="app-hold" />;
  const mine = user.role === "admin" ? state.approvals : state.approvals.filter((item) => item.userId === user.id);
  const waiting = mine.filter((item) => item.status === "pending");

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Approvals")}</p>
        <h1>{t("Waiting transfers")}</h1>
        <p className="lede">
          {t("Each member waits here when a transfer, including the 1% fee, is above that account’s approval limit. Admins send immediately.")}
        </p>
      </header>
      {waiting.length === 0 ? <p className="muted">{t("No transfers waiting.")}</p> : null}
      <ul className="tx-list">
        {mine.map((item) => (
          <li key={item.id}>
            <div>
              <strong>{item.holder}</strong>
              <span className="muted">
                {t(item.status === "pending" ? "Pending" : item.status === "approved" ? "Approved" : "Declined")} · {when(item.at, locale)}
              </span>
            </div>
            <span className="mono">{money(item.amount + item.fee, item.currency, locale)}</span>
            {user.role === "admin" && item.status === "pending" ? (
              <div className="user-actions">
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    setAsk({
                      id: item.id,
                      approve: true,
                      holder: item.holder,
                      total: money(item.amount + item.fee, item.currency, locale),
                    })
                  }
                >
                  {t("Approve")}
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    setAsk({
                      id: item.id,
                      approve: false,
                      holder: item.holder,
                      total: money(item.amount + item.fee, item.currency, locale),
                    })
                  }
                >
                  {t("Decline")}
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={ask !== null}
        title={ask?.approve ? t("Approve this transfer?") : t("Decline this transfer?")}
        body={
          ask?.approve
            ? t("{amount} to {holder} will be sent.", { amount: ask.total, holder: ask.holder })
            : t("The transfer to {holder} stays off the balance.", { holder: ask?.holder ?? "" })
        }
        confirmLabel={ask?.approve ? t("Approve") : t("Decline")}
        onClose={() => setAsk(null)}
        onConfirm={() => {
          if (!ask) return;
          const choice = ask;
          setAsk(null);
          void postAccount("approvals/" + choice.id, { approve: choice.approve }).then((result) => {
            if (result.status === 404) {
              const failed = decideApproval(choice.id, user.id, choice.approve);
              if (failed) {
                toast(t(failed));
                return;
              }
              toast(choice.approve ? t("Approved.") : t("Declined."));
              return;
            }
            if (result.error) {
              toast(t(result.error));
              return;
            }
            toast(choice.approve ? t("Approved.") : t("Declined."));
          });
        }}
      />
    </div>
  );
}
