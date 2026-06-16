"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BrandLogo } from "@/components/marketing/BrandLogo";
import { LanguageToggle } from "@/components/marketing/LanguageToggle";
import { useLocale } from "@/components/providers/LocaleProvider";
import { MARKETING_COPY, t } from "@/lib/i18n/marketing";

export function MarketingNavbar() {
  const { locale } = useLocale();
  const copy = MARKETING_COPY.nav;

  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--cs-border)] bg-white/92 backdrop-blur-md">
      <div className="marketing-container flex h-16 items-center justify-between gap-4">
        <Link href="/">
          <BrandLogo compact />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageToggle />
          <Link href="/login" className="marketing-btn-primary h-10 px-4 text-[13px]">
            {t(copy.signIn, locale)}
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </header>
  );
}
