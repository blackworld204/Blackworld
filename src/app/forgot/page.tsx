import { Suspense } from "react";
import type { Metadata } from "next";
import { ForgotForm } from "@/components/forgot-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPage() {
  return (
    <Suspense fallback={<div className="app-hold" />}>
      <ForgotForm />
    </Suspense>
  );
}
