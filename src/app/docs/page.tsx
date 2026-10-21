import type { Metadata } from "next";
import { DocsView } from "@/components/docs-view";

export const metadata: Metadata = { title: "API" };

export default function DocsPage() {
  return <DocsView />;
}
