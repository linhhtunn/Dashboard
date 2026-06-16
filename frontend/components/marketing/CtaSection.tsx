"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useLocale } from "@/components/providers/LocaleProvider";
import { MARKETING_COPY, t } from "@/lib/i18n/marketing";

export function CtaSection() {
  const { locale } = useLocale();
  const copy = MARKETING_COPY.cta;

  return (
    <section className="bg-[linear-gradient(135deg,var(--cs-primary),var(--cs-teal))] py-16 sm:py-20">
      <div className="marketing-container text-center">
        <h2 className="text-[1.85rem] font-bold leading-tight tracking-tight text-white sm:text-[2rem]">
          {t(copy.headline, locale)}
        </h2>
        <p className="marketing-body mx-auto mt-4 max-w-2xl text-white/88">
          {t(copy.sub, locale)}
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] bg-white px-6 text-[14px] font-semibold text-[color:var(--cs-primary)] shadow-[var(--shadow-soft)] transition hover:bg-[color:var(--cs-surface)]"
        >
          {t(copy.button, locale)}
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </Link>
      </div>
    </section>
  );
}
