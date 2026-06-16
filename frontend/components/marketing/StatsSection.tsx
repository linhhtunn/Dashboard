"use client";

import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";
import { useLocale } from "@/components/providers/LocaleProvider";
import { MARKETING_COPY, t } from "@/lib/i18n/marketing";

export function StatsSection() {
  const { locale } = useLocale();
  const copy = MARKETING_COPY.stats;

  return (
    <section className="bg-[color:var(--cs-primary)] py-16 text-white sm:py-20">
      <div className="marketing-container">
        <div className="grid gap-8 md:grid-cols-3">
          {copy.items.map((item, index) => (
            <RevealOnScroll key={item.value} delayMs={index * 90}>
              <div className="text-center md:text-left">
                <p className="marketing-metric text-[2rem] sm:text-[2.25rem]">
                  {item.value}
                </p>
                <p className="mt-2 text-[15px] font-semibold leading-snug text-white">
                  {t(item.label, locale)}
                </p>
                <p className="marketing-caption mt-1 text-white/65">
                  {t(item.caption, locale)}
                </p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
        <p className="marketing-caption mt-10 text-center text-white/55 md:text-left">
          * {t(copy.footnote, locale)}
        </p>
      </div>
    </section>
  );
}
