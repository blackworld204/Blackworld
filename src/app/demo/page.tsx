import type { Metadata } from "next";
import { DemoPlayer } from "@/components/demo-player";

export const metadata: Metadata = { title: "Demo" };

export default function DemoPage() {
  return <DemoPlayer />;
}
