"use client";

import { ArrowRight } from "lucide-react";

import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";
import { marketingContainer } from "@/components/marketing/marketing-styles";
import { useLocale } from "@/components/providers/LocaleProvider";
import { MARKETING_COPY, t } from "@/lib/i18n/marketing";

export function ProblemSolutionSection() {
  const { locale } = useLocale();
  const copy = MARKETING_COPY.problem;

  return (
    <section id="problem" className={`py-2 ${marketingContainer}`}>
      <div className="dashboard-surface rounded-[1.15rem] p-5 sm:p-6">
        <RevealOnScroll>
          <h2 className="max-w-3xl text-[1.5rem] font-semibold leading-8 tracking-tight text-[color:var(--cs-heading)]">
            {t(copy.headline, locale)}
          </h2>
        </RevealOnScroll>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {copy.items.map((item, index) => (
            <RevealOnScroll key={item.pain.vi} delayMs={index * 80} lift>
              <article className="dashboard-glass-soft h-full rounded-[1rem] p-4">
                <p className="text-[14px] leading-[22px] text-[color:var(--cs-text-soft)]">
                  {t(item.pain, locale)}
                </p>
                <div className="my-3 flex items-center gap-2 text-[color:var(--cs-teal)]">
                  <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <div className="h-px flex-1 bg-[color:var(--cs-border)]" />
                </div>
                <p className="text-[14px] font-semibold leading-[22px] text-[color:var(--cs-heading)]">
                  {t(item.solution, locale)}
                </p>
              </article>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
