"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";

import { BrandLogo } from "@/components/marketing/BrandLogo";
import { LiveVitalsStripSkeleton } from "@/components/marketing/LiveVitalsStrip";
import { useLocale } from "@/components/providers/LocaleProvider";
import { MARKETING_COPY, t } from "@/lib/i18n/marketing";

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
    <section className="relative overflow-hidden marketing-section-panel">
      <div className="marketing-hero-motif" aria-hidden />

      <div className="marketing-container relative pb-10 pt-10 sm:pt-14">
        <div className="mb-8 hidden sm:block">
          <BrandLogo showTagline />
        </div>

        <h1 className="marketing-h1 max-w-3xl whitespace-pre-line">
          {t(copy.headline, locale)}
        </h1>
        <p className="marketing-body mt-5 max-w-2xl text-[15px] leading-6 sm:text-base">
          {t(copy.sub, locale)}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className="marketing-btn-primary">
            {t(copy.ctaPrimary, locale)}
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </Link>
          <button type="button" onClick={scrollToProblem} className="marketing-btn-secondary">
            {t(copy.ctaSecondary, locale)}
            <ArrowDown className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <LiveVitalsStrip />
    </section>
  );
}
