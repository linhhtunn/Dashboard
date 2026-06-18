"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

import { BrandLogo } from "@/components/marketing/BrandLogo";
import { LiveVitalsStripSkeleton } from "@/components/marketing/LiveVitalsStrip";
import {
  dashboardPrimaryBtn,
  dashboardSecondaryBtn,
  marketingContainer,
} from "@/components/marketing/marketing-styles";
import { useLocale } from "@/components/providers/LocaleProvider";
import { MARKETING_COPY, t } from "@/lib/i18n/marketing";
import { staggerContainer, staggerItem } from "@/lib/motion/presets";

const LiveVitalsStrip = dynamic(
  () =>
    import("@/components/marketing/LiveVitalsStrip").then(
      (module) => module.LiveVitalsStrip,
    ),
  { ssr: false, loading: () => <LiveVitalsStripSkeleton /> },
);

export function HeroSection() {
  const { locale } = useLocale();
  const copy = MARKETING_COPY.hero;

  const scrollToProblem = () => {
    document.getElementById("problem")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="dashboard-surface overflow-hidden rounded-[1.15rem]">
      <motion.div
        className={`relative pb-8 pt-8 sm:pt-10 ${marketingContainer}`}
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={staggerItem} className="mb-6 hidden sm:block">
          <BrandLogo showTagline />
        </motion.div>

        <motion.p
          variants={staggerItem}
          className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--cs-teal)]"
        >
          {locale === "vi" ? "Giám sát lâm sàng thông minh" : "Intelligent clinical monitoring"}
        </motion.p>
        <motion.h1
          variants={staggerItem}
          className="mt-2 max-w-3xl whitespace-pre-line text-[1.9rem] font-bold leading-tight tracking-[-0.03em] text-[color:var(--cs-heading)] sm:text-[2.25rem]"
        >
          {t(copy.headline, locale)}
        </motion.h1>
        <motion.p
          variants={staggerItem}
          className="mt-4 max-w-2xl text-[14px] leading-[22px] text-[color:var(--cs-text)]"
        >
          {t(copy.sub, locale)}
        </motion.p>

        <motion.div variants={staggerItem} className="mt-7 flex flex-wrap gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link href="/login" className={dashboardPrimaryBtn}>
              {t(copy.ctaPrimary, locale)}
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <button type="button" onClick={scrollToProblem} className={dashboardSecondaryBtn}>
              {t(copy.ctaSecondary, locale)}
              <ArrowDown className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <LiveVitalsStrip />
      </motion.div>
    </section>
  );
}
