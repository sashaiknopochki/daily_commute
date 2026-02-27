import type { NextConfig } from "next";

// transpilePackages: webpack will run SWC over these node_modules entries so
// the browserslist target ("ios >= 12") is respected, eliminating ?. and ??
// operators that Safari 12 cannot parse.
// Turbopack (used in `next dev`) ignores browserslist — always deploy with
// `next build && next start` for the wall iPad (iOS 12).
const nextConfig: NextConfig = {
  transpilePackages: [
    // Radix UI umbrella package
    "radix-ui",
    // Individual @radix-ui/* packages confirmed to ship ?. / ?? in dist
    "@radix-ui/primitive",
    "@radix-ui/react-alert-dialog",
    "@radix-ui/react-collection",
    "@radix-ui/react-context",
    "@radix-ui/react-dialog",
    "@radix-ui/react-dismissable-layer",
    "@radix-ui/react-focus-guards",
    "@radix-ui/react-focus-scope",
    "@radix-ui/react-form",
    "@radix-ui/react-id",
    "@radix-ui/react-label",
    "@radix-ui/react-menu",
    "@radix-ui/react-portal",
    "@radix-ui/react-presence",
    "@radix-ui/react-slot",
    "@radix-ui/react-use-callback-ref",
    "@radix-ui/react-use-controllable-state",
    "@radix-ui/react-use-effect-event",
    "@radix-ui/react-use-escape-keydown",
    "@radix-ui/react-use-layout-effect",
    // uuid is no longer imported client-side (replaced by inline generateUUID)
    // but listed here as a safety net for any indirect server-side require
    "uuid",
    // zod v4 ships ?./?? operators in its compiled dist files
    "zod",
  ],
};

export default nextConfig;
