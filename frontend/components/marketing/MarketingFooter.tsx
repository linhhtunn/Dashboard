"use client";

import { BrandLogo } from "@/components/marketing/BrandLogo";
import { LanguageToggle } from "@/components/marketing/LanguageToggle";
import { useLocale } from "@/components/providers/LocaleProvider";
import { MARKETING_COPY, t } from "@/lib/i18n/marketing";

export function MarketingFooter() {
  const { locale } = useLocale();
  const copy = MARKETING_COPY.footer;

  return (
    <footer className="border-t border-[color:var(--cs-border)] bg-white py-10">
      <div className="marketing-container flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          <BrandLogo showTagline />
          <p className="marketing-caption mt-4">{t(copy.copyright, locale)}</p>
          <p className="mt-3 text-[13px] font-medium leading-6 text-[color:var(--cs-heading)]">
            {t(copy.disclaimer, locale)}
          </p>
          <p className="marketing-caption mt-1">{t(copy.disclaimerSub, locale)}</p>
        </div>

        <div className="shrink-0">
          <LanguageToggle />
        </div>
      </div>
    </footer>
  );
}
