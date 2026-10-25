import type { Metadata, Viewport } from "next";
import {
  IBM_Plex_Mono,
  Instrument_Sans,
  Instrument_Serif,
} from "next/font/google";
import { Chrome } from "@/components/chrome";
import { Toaster } from "@/components/toast";
import { LiveChat } from "@/components/live-chat";
import { Motion } from "@/components/motion";
import { SmoothScroll } from "@/components/smooth-scroll";
import { PushBridge } from "@/components/push-bridge";
import { I18nProvider } from "@/i18n/provider";
import { DeskSync } from "@/components/desk-sync";
import { SessionProvider } from "@/components/session";
import { VaultBoot } from "@/components/vault-boot";
import "./globals.css";

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Blackworld",
    template: "%s · Blackworld",
  },
  description:
    "Banking infrastructure for fintechs and institutions. Full-reserve, Puerto Rico licensed, API-first.",
};

export const viewport: Viewport = {
  themeColor: "#efeae1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${sans.variable} ${serif.variable} ${mono.variable}`}
    >
      <body>
        <I18nProvider>
          <SessionProvider>
            <VaultBoot />
            <DeskSync />
            <Motion />
            <SmoothScroll />
            <PushBridge />
            <Chrome>{children}</Chrome>
            <Toaster />
            <LiveChat />
          </SessionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
