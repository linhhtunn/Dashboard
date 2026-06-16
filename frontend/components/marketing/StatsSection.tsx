"use client";

import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";
import { marketingContainer } from "@/components/marketing/marketing-styles";
import { useLocale } from "@/components/providers/LocaleProvider";
import { MARKETING_COPY, t } from "@/lib/i18n/marketing";

export function StatsSection() {
  const { locale } = useLocale();
  const copy = MARKETING_COPY.stats;

  return (
    <section className={`py-2 ${marketingContainer}`}>
      <div className="dashboard-surface overflow-hidden rounded-[1.15rem] bg-[linear-gradient(135deg,rgba(13,71,161,0.95),rgba(0,150,136,0.88))] p-5 text-white sm:p-6">
        <div className="grid gap-8 md:grid-cols-3">
          {copy.items.map((item, index) => (
            <RevealOnScroll key={item.value} delayMs={index * 90}>
              <div className="text-center md:text-left">
                <p className="font-mono text-[2rem] font-semibold leading-none tracking-tight text-[color:var(--cs-aqua)] sm:text-[2.25rem]">
                  {item.value}
                </p>
                <p className="mt-2 text-[14px] font-semibold leading-snug">
                  {t(item.label, locale)}
                </p>
                <p className="mt-1 text-[12px] leading-4 text-white/65">
                  {t(item.caption, locale)}
                </p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
        <p className="mt-8 text-[12px] leading-4 text-white/55">
          * {t(copy.footnote, locale)}
        </p>
      </div>
    </section>
  );
}
