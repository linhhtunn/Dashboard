"use client";

import { motion } from "motion/react";

import { RevealOnScroll } from "@/components/marketing/RevealOnScroll";
import { marketingContainer } from "@/components/marketing/marketing-styles";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import { staggerContainer, staggerItem } from "@/lib/motion/presets";

type LegalPageProps = {
  kind: "privacy" | "terms";
};

export function LegalPage({ kind }: LegalPageProps) {
  const ui = useClinicalUi();
  const copy = kind === "privacy" ? ui.legal.privacy : ui.legal.terms;

  return (
    <div className={`py-4 ${marketingContainer}`}>
      <RevealOnScroll>
        <article className="dashboard-surface rounded-[1.15rem] p-6 sm:p-8">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            <motion.p
              variants={staggerItem}
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--cs-teal)]"
            >
              {copy.eyebrow}
            </motion.p>
            <motion.h1
              variants={staggerItem}
              className="mt-2 text-[1.6rem] font-bold tracking-tight text-[color:var(--cs-heading)]"
            >
              {copy.title}
            </motion.h1>
            <motion.p
              variants={staggerItem}
              className="mt-2 text-[12px] text-[color:var(--cs-text-soft)]"
            >
              {copy.updated}
            </motion.p>
            <motion.div className="mt-6 space-y-4" variants={staggerContainer}>
              {copy.sections.map((section, index) => (
                <motion.section
                  key={section.title}
                  variants={staggerItem}
                  custom={index}
                >
                  <h2 className="text-[15px] font-semibold text-[color:var(--cs-heading)]">
                    {section.title}
                  </h2>
                  <p className="mt-2 text-[14px] leading-[22px] text-[color:var(--cs-text)]">
                    {section.body}
                  </p>
                </motion.section>
              ))}
            </motion.div>
          </motion.div>
        </article>
      </RevealOnScroll>
    </div>
  );
}
