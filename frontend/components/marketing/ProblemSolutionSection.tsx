"use client";

import { ArrowRight } from "lucide-react";

import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";
import { useLocale } from "@/components/providers/LocaleProvider";
import { MARKETING_COPY, t } from "@/lib/i18n/marketing";

export function ProblemSolutionSection() {
  const { locale } = useLocale();
  const copy = MARKETING_COPY.problem;

  return (
    <section id="problem" className="marketing-section-muted py-16 sm:py-20">
      <div className="marketing-container">
        <h2 className="marketing-h2 max-w-3xl">{t(copy.headline, locale)}</h2>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {copy.items.map((item, index) => (
            <RevealOnScroll key={item.pain.vi} delayMs={index * 80}>
              <article className="marketing-card h-full p-5">
                <p className="marketing-body text-[color:var(--cs-text-soft)]">
                  {t(item.pain, locale)}
                </p>
                <div className="my-4 flex items-center gap-2 text-[color:var(--cs-teal)]">
                  <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <div className="h-px flex-1 bg-[color:var(--cs-border)]" />
                </div>
                <p className="text-[15px] font-semibold leading-6 text-[color:var(--cs-heading)]">
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
