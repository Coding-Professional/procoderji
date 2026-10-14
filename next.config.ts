import type { NextConfig } from "next";

/**
 * Conservative response headers. No Content-Security-Policy yet: the site loads
 * an animation from lottie.host and Next.js inline scripts, so a CSP needs its
 * own careful rollout.
 */
export const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Do not announce the framework in an "X-Powered-By: Next.js" response header.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // The old plain /courses/... reader duplicated the dashboard (same URL structure, no styling).
  // Send visitors and any old links to the real pages instead of serving duplicate content.
  async redirects() {
    return [
      { source: "/courses", destination: "/dashboard", permanent: true },
      { source: "/courses/:path*", destination: "/dashboard/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
