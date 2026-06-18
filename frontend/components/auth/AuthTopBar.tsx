"use client";

import Link from "next/link";
import { Globe2 } from "lucide-react";
import { motion } from "motion/react";

import { BrandLogo } from "@/components/marketing/BrandLogo";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import { navbarVariants } from "@/lib/motion/presets";

export function AuthTopBar() {
  const { locale, setLocale } = useLocale();
  const ui = useClinicalUi();

  return (
    <motion.header
      className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/50 px-5 sm:px-8 lg:px-10"
      variants={navbarVariants}
      initial="hidden"
      animate="visible"
    >
      <Link href="/" className="lg:hidden">
        <BrandLogo compact />
      </Link>
      <Link
        href="/"
        className="hidden text-[13px] font-semibold text-[color:var(--cs-primary)] hover:underline lg:inline"
      >
        {ui.auth.backHome}
      </Link>
      <motion.button
        type="button"
        onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
        className="dashboard-input ml-auto flex h-9 items-center gap-1.5 rounded-[0.7rem] px-2 text-[12px] font-semibold text-[color:var(--cs-text)]"
        aria-label={ui.common.switchLanguage}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <Globe2 className="h-4 w-4 text-[color:var(--cs-teal)]" />
        {locale.toUpperCase()}
      </motion.button>
    </motion.header>
  );
}
