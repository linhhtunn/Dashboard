"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { dashboardPrimaryBtn, marketingContainer } from "@/components/marketing/marketing-styles";
import { useLocale } from "@/components/providers/LocaleProvider";
import { MARKETING_COPY, t } from "@/lib/i18n/marketing";

export function CtaSection() {
  const { locale } = useLocale();
  const copy = MARKETING_COPY.cta;

  return (
    <section className={`py-2 ${marketingContainer}`}>
      <div className="dashboard-surface rounded-[1.15rem] bg-[linear-gradient(135deg,rgba(13,71,161,0.96),rgba(0,150,136,0.9))] px-5 py-10 text-center sm:px-8 sm:py-12">
        <h2 className="text-[1.6rem] font-bold leading-tight tracking-tight text-white sm:text-[1.85rem]">
          {t(copy.headline, locale)}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-[14px] leading-[22px] text-white/88">
          {t(copy.sub, locale)}
        </p>
        <Link
          href="/login"
          className={`${dashboardPrimaryBtn} mt-7 bg-white text-[color:var(--cs-primary)] shadow-[var(--shadow-soft)] hover:brightness-100 hover:bg-[color:var(--cs-surface)]`}
        >
          {t(copy.button, locale)}
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </Link>
      </div>
    </section>
  );
}
