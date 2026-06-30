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
  },
};

export default withBundleAnalyzer(nextConfig);
