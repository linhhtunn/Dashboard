import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { assertProductionConfiguration } from "./lib/runtime-config";

assertProductionConfiguration();

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  experimental: {
    webVitalsAttribution: ["CLS", "FCP", "FID", "INP", "LCP", "TTFB"],
    // Tree-shake heavy barrel-import libraries so only the icons/charts/primitives
    // actually used land in each route's client bundle (lucide-react is optimized
    // by Next by default; these are the remaining heavy ones in this app).
    optimizePackageImports: ["recharts", "motion", "radix-ui"],
  },
};

export default withBundleAnalyzer(nextConfig);
