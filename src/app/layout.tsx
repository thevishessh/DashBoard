import type { Metadata } from "next";
import { DM_Mono, Instrument_Sans, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

// Self-hosted at build time; the family names match --font-display, --font-body and --font-outlier in tokens.css.
const display = Schibsted_Grotesk({ subsets: ["latin"], weight: ["700"], variable: "--font-face-display" });
const body = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-face-body" });
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-face-mono" });

export const metadata: Metadata = {
  title: "Overview | Registrar Office",
  description: "Registrar Office dashboard: document verification and student complaints and requests.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
