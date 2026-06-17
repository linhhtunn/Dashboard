"use client";

import { Activity, Bell, Shield, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { BrandLogo } from "@/components/marketing/BrandLogo";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import { brandPanelVariants, staggerContainer, staggerItem } from "@/lib/motion/presets";

export function AuthBrandPanel() {
  const ui = useClinicalUi();
  const highlights = [
    { icon: Activity, text: ui.auth.brandHighlightVitals },
    { icon: Bell, text: ui.auth.brandHighlightAlerts },
    { icon: Sparkles, text: ui.auth.brandHighlightAi },
    { icon: Shield, text: ui.auth.brandHighlightTrust },
  ];

  return (
    <motion.aside
      className="relative hidden overflow-hidden bg-[linear-gradient(145deg,var(--cs-primary),#0a3f8f_45%,var(--cs-teal))] p-10 text-white lg:flex lg:flex-col lg:justify-between"
      variants={brandPanelVariants}
      initial="hidden"
      animate="visible"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
      <motion.div
        className="relative"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.12 }}
      >
        <BrandLogo variant="dark" showTagline />
      </motion.div>

      <motion.div
        className="relative space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.h2
          variants={staggerItem}
          className="max-w-md text-[1.75rem] text-white font-bold leading-tight tracking-tight"
        >
          {ui.auth.brandHeadline}
        </motion.h2>
        <motion.p
          variants={staggerItem}
          className="max-w-md text-[14px] leading-[22px] text-white/85"
        >
          {ui.auth.brandSubline}
        </motion.p>
        <motion.ul className="space-y-3" variants={staggerContainer}>
          {highlights.map(({ icon: Icon, text }) => (
            <motion.li
              key={text}
              variants={staggerItem}
              className="flex items-start gap-3 text-[13px] leading-5"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.7rem] bg-white/12">
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              {text}
            </motion.li>
          ))}
        </motion.ul>
      </motion.div>

      <motion.p
        className="relative text-[11px] leading-4 text-white/65"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, delay: 0.45 }}
      >
        {ui.auth.brandDisclaimer}
      </motion.p>
    </motion.aside>
  );
}
