import type { Metadata } from "next";
import { Geist_Mono, Manrope } from "next/font/google";

import { AppShell, ClinicalChrome } from "@/components/AppShell";
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
  title: "CareSignal AI — Theo dõi rõ hơn. Phản ứng nhanh hơn.",
  description:
    "Nền tảng theo dõi bệnh nhân realtime tích hợp AI lâm sàng cho bác sĩ và đội ngũ y tế.",
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
      <body className="min-h-dvh">
        <LocaleProvider>
          <AppShell>{children}</AppShell>
          <ClinicalChrome />
        </LocaleProvider>
      </body>
    </html>
  );
}
