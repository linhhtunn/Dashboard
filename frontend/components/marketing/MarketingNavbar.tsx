"use client";

import Link from "next/link";
import { Globe2 } from "lucide-react";
import { motion } from "motion/react";

import { BrandLogo } from "@/components/marketing/BrandLogo";
import { dashboardSecondaryBtn } from "@/components/marketing/marketing-styles";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import { MARKETING_COPY, t } from "@/lib/i18n/marketing";
import { navbarVariants } from "@/lib/motion/presets";

export function MarketingNavbar() {
  const { locale, setLocale } = useLocale();
  const ui = useClinicalUi();
  const copy = MARKETING_COPY.nav;

  return (
    <motion.header
      className="dashboard-glass relative z-40 mx-3 mt-3 shrink-0 rounded-[1.15rem] border border-white/45 px-3 shadow-[0_22px_48px_rgba(15,23,42,0.08)] sm:mx-5 sm:px-5 xl:mx-6"
      variants={navbarVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="mx-auto flex h-[60px] w-full max-w-[1600px] items-center justify-between gap-3">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Link href="/">
            <BrandLogo compact />
          </Link>
        </motion.div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <motion.button
            type="button"
            onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
            className="dashboard-input flex h-9 items-center gap-1.5 rounded-[0.7rem] px-2 text-[12px] font-semibold text-[color:var(--cs-text)]"
            aria-label={ui.common.switchLanguage}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Globe2 className="h-4 w-4 text-[color:var(--cs-teal)]" />
            {locale.toUpperCase()}
          </motion.button>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/login"
              className={`${dashboardSecondaryBtn} hidden h-9 px-4 text-[13px] sm:inline-flex`}
            >
              {t(copy.signIn, locale)}
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}
