import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = { title: "Sales" };

export default function SalesPage() {
  return <ContactForm title="Talk to sales" fields="sales" />;
}
