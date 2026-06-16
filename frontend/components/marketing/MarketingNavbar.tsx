"use client";

import Link from "next/link";
import { ArrowRight, Globe2 } from "lucide-react";

import { BrandLogo } from "@/components/marketing/BrandLogo";
import {
  dashboardPrimaryBtn,
} from "@/components/marketing/marketing-styles";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import { MARKETING_COPY, t } from "@/lib/i18n/marketing";

export function MarketingNavbar() {
  const { locale, setLocale } = useLocale();
  const ui = useClinicalUi();
  const copy = MARKETING_COPY.nav;

  return (
    <header className="dashboard-glass relative z-40 mx-3 mt-3 shrink-0 rounded-[1.15rem] border border-white/45 px-3 shadow-[0_22px_48px_rgba(15,23,42,0.08)] sm:mx-5 sm:px-5 xl:mx-6">
      <div className="mx-auto flex h-[60px] w-full max-w-[1600px] items-center justify-between gap-3">
        <Link href="/">
          <BrandLogo compact />
        </Link>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
            className="dashboard-input flex h-9 items-center gap-1.5 rounded-[0.7rem] px-2 text-[12px] font-semibold text-[color:var(--cs-text)] transition hover:border-white/80 hover:bg-white/70"
            aria-label={ui.common.switchLanguage}
          >
            <Globe2 className="h-4 w-4 text-[color:var(--cs-teal)]" />
            {locale.toUpperCase()}
          </button>
          <Link href="/login" className={`${dashboardPrimaryBtn} h-9 px-4 text-[13px]`}>
            {t(copy.signIn, locale)}
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </header>
  );
}
