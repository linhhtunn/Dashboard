"use client";

import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";
import { useLocale } from "@/components/providers/LocaleProvider";
import { MARKETING_COPY, t } from "@/lib/i18n/marketing";

export function RoleCards() {
  const { locale } = useLocale();
  const copy = MARKETING_COPY.roles;

  return (
    <section className="marketing-section-muted py-16 sm:py-20">
      <div className="marketing-container">
        <h2 className="marketing-h2">{t(copy.headline, locale)}</h2>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {copy.items.map((role, index) => (
            <RevealOnScroll key={role.title.vi} delayMs={index * 80}>
              <article className="marketing-card h-full p-6">
                <h3 className="text-[18px] font-semibold leading-[26px] text-[color:var(--cs-heading)]">
                  {t(role.title, locale)}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {role.bullets.map((bullet) => (
                    <li
                      key={bullet.vi}
                      className="marketing-body flex gap-2 text-[color:var(--cs-text)]"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--cs-teal)]" />
                      {t(bullet, locale)}
                    </li>
                  ))}
                </ul>
              </article>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
