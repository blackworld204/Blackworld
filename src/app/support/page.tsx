import type { Metadata } from "next";
import { SupportView } from "@/components/support-view";

export const metadata: Metadata = { title: "Support" };

export default function SupportPage() {
  return <SupportView />;
}
