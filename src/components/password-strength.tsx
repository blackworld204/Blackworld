"use client";

import { useI18n } from "@/i18n/provider";
import { passwordChecks, passwordLevel, passwordLevelLabel } from "@/lib/password-strength";

const tones = ["", "weak", "fair", "good", "strong"] as const;

export function PasswordStrength({ password }: { password: string }) {
  const { t } = useI18n();
  const checks = passwordChecks(password);
  const level = passwordLevel(password);
  const tone = tones[level];
  const label = passwordLevelLabel(level);

  return (
    <div className="pw-strength">
      <div
        className={tone ? `pw-meter is-${tone}` : "pw-meter"}
        role="meter"
        aria-label={t("Password strength")}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={level}
        aria-valuetext={label ? t(label) : undefined}
      >
        {[0, 1, 2, 3].map((index) => (
          <span key={index} className={index < level ? "is-on" : undefined} />
        ))}
      </div>
      {label ? <p className={`pw-label is-${tone}`}>{t(label)}</p> : null}
      <ul className="pw-rules">
        {checks.map((check) => (
          <li key={check.id} className={check.pass ? "is-met" : undefined}>
            {t(check.label)}
          </li>
        ))}
      </ul>
    </div>
  );
}
