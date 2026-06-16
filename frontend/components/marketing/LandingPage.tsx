"use client";

import { CtaSection } from "@/components/marketing/CtaSection";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { HeroSection } from "@/components/marketing/HeroSection";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { ProblemSolutionSection } from "@/components/marketing/ProblemSolutionSection";
import { RoleCards } from "@/components/marketing/RoleCards";
import { StatsSection } from "@/components/marketing/StatsSection";

export function LandingPage() {
  return (
    <>
      <MarketingNavbar />
      <main>
        <HeroSection />
        <ProblemSolutionSection />
        <FeatureGrid />
        <StatsSection />
        <RoleCards />
        <CtaSection />
      </main>
      <MarketingFooter />
    </>
  );
}
