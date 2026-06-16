"use client";

import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";
import { marketingContainer } from "@/components/marketing/marketing-styles";
import { useLocale } from "@/components/providers/LocaleProvider";
import { MARKETING_COPY, t } from "@/lib/i18n/marketing";

export function RoleCards() {
  const { locale } = useLocale();
  const copy = MARKETING_COPY.roles;

  return (
    <section className={`py-2 ${marketingContainer}`}>
      <div className="dashboard-surface rounded-[1.15rem] p-5 sm:p-6">
        <h2 className="text-[1.5rem] font-semibold leading-8 tracking-tight text-[color:var(--cs-heading)]">
          {t(copy.headline, locale)}
        </h2>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {copy.items.map((role, index) => (
            <RevealOnScroll key={role.title.vi} delayMs={index * 80}>
              <article className="dashboard-glass-soft h-full rounded-[1rem] p-5">
                <h3 className="text-[18px] font-semibold leading-[26px] text-[color:var(--cs-heading)]">
                  {t(role.title, locale)}
                </h3>
                <ul className="mt-3 space-y-2">
                  {role.bullets.map((bullet) => (
                    <li
                      key={bullet.vi}
                      className="flex gap-2 text-[14px] leading-[22px] text-[color:var(--cs-text)]"
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
