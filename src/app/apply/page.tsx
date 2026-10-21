import type { Metadata } from "next";
import { ApplyForm } from "@/components/apply-form";

export const metadata: Metadata = { title: "Apply" };

export default function ApplyPage() {
  return <ApplyForm />;
}
