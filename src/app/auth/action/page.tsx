import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthAction } from "@/components/auth-action";

export const metadata: Metadata = { title: "Sign-in" };

export default function AuthActionPage() {
  return (
    <Suspense fallback={<div className="app-hold" />}>
      <AuthAction />
    </Suspense>
  );
}
