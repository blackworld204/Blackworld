"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Notice } from "@/components/notice";

export function Chrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path.startsWith("/dashboard")) return children;

  return (
    <>
      <div className="sticky-top">
        <Notice />
        <Header />
      </div>
      <main key={path}>{children}</main>
      <Footer />
    </>
  );
}
