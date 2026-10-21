import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalView } from "@/components/legal-view";
import { legalPages, type LegalSlug } from "@/lib/legal";

const slugs: LegalSlug[] = ["terms", "privacy", "compliance"];

export function generateStaticParams() {
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isSlug(slug)) return { title: "Legal" };
  return { title: legalPages[slug].title };
}

function isSlug(slug: string): slug is LegalSlug {
  return slug in legalPages;
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isSlug(slug)) notFound();
  return <LegalView slug={slug} />;
}
