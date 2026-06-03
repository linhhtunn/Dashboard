import type { Metadata } from "next";
import { Geist_Mono, Manrope } from "next/font/google";

import { LocaleProvider } from "@/components/providers/LocaleProvider";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CareSignal AI Dashboard",
  description: "AI-first clinical monitoring dashboard for CareSignal AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${manrope.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
