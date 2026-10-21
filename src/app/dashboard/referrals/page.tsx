"use client";

import { ReferralPanel } from "@/components/referral-panel";
import { useAccount } from "@/components/use-account";

export default function ReferralsPage() {
  const { user } = useAccount();
  if (!user) return <div className="app-hold" />;
  return (
    <div className="app-pad">
      <ReferralPanel />
    </div>
  );
}
