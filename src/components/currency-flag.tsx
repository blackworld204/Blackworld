"use client";

import { useEffect, useState } from "react";
import { flagEmoji, flagImageUrl, resolveFlagCountry } from "@/lib/flag-codes";

export function hasCurrencyFlag(code: string) {
  return Boolean(resolveFlagCountry(code));
}

function EmojiFlag({ country }: { country: string }) {
  const emoji = flagEmoji(country);
  if (!emoji) return null;
  return (
    <span className="ccy-flag ccy-flag-emoji" aria-hidden="true">
      {emoji}
    </span>
  );
}

export function CurrencyFlag({ code }: { code: string }) {
  const country = resolveFlagCountry(code);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [country]);

  if (!country) return null;

  if (failed) return <EmojiFlag country={country} />;

  return (
    <img
      className="ccy-flag"
      src={flagImageUrl(country, 40)}
      srcSet={`${flagImageUrl(country, 80)} 2x`}
      width={22}
      height={15}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
