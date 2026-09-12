import type { Metadata, Viewport } from "next";
import { Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";
import { Providers } from "@/src/components/providers";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "THE SYSTEM";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: `${APP_NAME} — Life RPG`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "You have acquired the qualifications to be a Player. Turn real-world quests — study, training, discipline, connection — into XP, ranks, forged weapons, and broken Gates.",
  keywords: ["life rpg", "habit tracker", "gamified productivity", "solo leveling", "quests", "streaks"],
  openGraph: {
    title: `${APP_NAME} — Life RPG`,
    description: "The start of every great story is the day you stop waiting. Complete real quests. Break real Gates. Arise.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#04060d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${rajdhani.variable}`}>
      <body>
        <div className="system-bg" aria-hidden="true" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
