import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack (used by default in `next dev`) does NOT transpile for old browsers.
  // The production webpack build respects the browserslist in package.json ("ios >= 12").
  // For the wall iPad (iOS 12), always deploy with `next build && next start`.
};

export default nextConfig;
