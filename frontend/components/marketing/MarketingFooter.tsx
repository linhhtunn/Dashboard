"use client";

import { Globe2 } from "lucide-react";

import { BrandLogo } from "@/components/marketing/BrandLogo";
import { marketingContainer } from "@/components/marketing/marketing-styles";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import { MARKETING_COPY, t } from "@/lib/i18n/marketing";

export function MarketingFooter() {
  const { locale, setLocale } = useLocale();
  const ui = useClinicalUi();
  const copy = MARKETING_COPY.footer;

  return (
    <footer className={`pb-6 pt-2 ${marketingContainer}`}>
      <div className="dashboard-glass-soft rounded-[1.15rem] p-5 sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xl">
            <BrandLogo showTagline />
            <p className="mt-4 text-[12px] leading-4 text-[color:var(--cs-text-soft)]">
              {t(copy.copyright, locale)}
            </p>
            <p className="mt-3 text-[13px] font-medium leading-6 text-[color:var(--cs-heading)]">
              {t(copy.disclaimer, locale)}
            </p>
            <p className="mt-1 text-[12px] leading-4 text-[color:var(--cs-text-soft)]">
              {t(copy.disclaimerSub, locale)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
            className="dashboard-input flex h-9 shrink-0 items-center gap-1.5 self-start rounded-[0.7rem] px-2 text-[12px] font-semibold text-[color:var(--cs-text)]"
            aria-label={ui.common.switchLanguage}
          >
            <Globe2 className="h-4 w-4 text-[color:var(--cs-teal)]" />
            {locale.toUpperCase()}
          </button>
        </div>
      </div>
    </footer>
  );
}
