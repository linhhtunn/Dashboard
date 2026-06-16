"use client";

import { Activity, Bell, Sparkles, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";
import { marketingContainer } from "@/components/marketing/marketing-styles";
import { useLocale } from "@/components/providers/LocaleProvider";
import { MARKETING_COPY, t } from "@/lib/i18n/marketing";

const icons: LucideIcon[] = [Activity, Bell, Sparkles, Users];

export function FeatureGrid() {
  const { locale } = useLocale();
  const copy = MARKETING_COPY.features;

  return (
    <section className={`py-2 ${marketingContainer}`}>
      <div className="dashboard-surface rounded-[1.15rem] p-5 sm:p-6">
        <h2 className="text-[1.5rem] font-semibold leading-8 tracking-tight text-[color:var(--cs-heading)]">
          {t(copy.headline, locale)}
        </h2>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {copy.items.map((item, index) => {
            const Icon = icons[index] ?? Activity;
            return (
              <RevealOnScroll key={item.title.vi} delayMs={index * 70}>
                <article className="dashboard-glass-soft h-full rounded-[1rem] p-5">
                  <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-[0.8rem] bg-[linear-gradient(135deg,rgba(13,71,161,0.12),rgba(0,150,136,0.1))] text-[color:var(--cs-primary)]">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                    {index === 1 ? (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--cs-danger)] px-1 text-[9px] font-bold text-white">
                        !
                      </span>
                    ) : null}
                  </span>
                  <h3 className="mt-3 text-[18px] font-semibold leading-[26px] text-[color:var(--cs-heading)]">
                    {t(item.title, locale)}
                  </h3>
                  <p className="mt-2 text-[14px] leading-[22px] text-[color:var(--cs-text-soft)]">
                    {t(item.body, locale)}
                  </p>
                </article>
              </RevealOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
