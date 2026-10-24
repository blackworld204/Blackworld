import type { Metadata } from "next";
import { ApplyForm } from "@/components/apply-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return <ApplyForm />;
}
