"use client";

import { Activity, Bell, Sparkles, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";
import { useLocale } from "@/components/providers/LocaleProvider";
import { MARKETING_COPY, t } from "@/lib/i18n/marketing";

const icons: LucideIcon[] = [Activity, Bell, Sparkles, Users];

export function FeatureGrid() {
  const { locale } = useLocale();
  const copy = MARKETING_COPY.features;

  return (
    <section className="marketing-section-panel py-16 sm:py-20">
      <div className="marketing-container">
        <h2 className="marketing-h2">{t(copy.headline, locale)}</h2>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {copy.items.map((item, index) => {
            const Icon = icons[index] ?? Activity;
            return (
              <RevealOnScroll key={item.title.vi} delayMs={index * 70}>
                <article className="marketing-card h-full bg-[color:var(--cs-surface)] p-6">
                  <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[color:rgba(142,211,230,0.22)] text-[color:var(--cs-primary)]">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                    {index === 1 ? (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--cs-danger)] px-1 text-[9px] font-bold text-white">
                        !
                      </span>
                    ) : null}
                  </span>
                  <h3 className="mt-4 text-[18px] font-semibold leading-[26px] text-[color:var(--cs-heading)]">
                    {t(item.title, locale)}
                  </h3>
                  <p className="marketing-body mt-2">{t(item.body, locale)}</p>
                </article>
              </RevealOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
