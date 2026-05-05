/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "flagcdn.com",
      },
    ],
  },

  /**
   * Security headers applied to every response.
   * These protect against XSS, clickjacking, MIME sniffing,
   * and enforce HTTPS in production.
   */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // ── HTTPS Enforcement ──
          {
            key: "Strict-Transport-Security",
            value: "max-age=1209600; includeSubDomains; preload",
          },

          // ── Content Security Policy ──
          // Restricts resource loading to trusted sources only.
          // - default-src 'self': Only load from same origin by default
          // - script-src 'self' 'unsafe-eval': Next.js dev needs eval;
          //   in production, HMR chunks require 'self' only
          // - style-src: Tailwind via <style>, inline styles via 'unsafe-inline'
          // - img-src: self + data: (SVGs) + flagcdn.com (flags)
          // - connect-src: self + Supabase + Google Gemini API
          // - font-src: self + system fonts
          // - frame-ancestors 'none': Prevent clickjacking (replaces X-Frame-Options)
          // - base-uri 'self': Prevent base tag injection
          // - form-action 'self': Prevent form submission to external sites
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://flagcdn.com",
              "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com",
              "font-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },

          // ── Prevent MIME-type sniffing ──
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },

          // ── Referrer Policy ──
          // Only send referrer to same-origin; strip for cross-origin requests
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },

          // ── Permissions Policy ──
          // Deny access to browser features not needed by this app
          {
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "geolocation=()",
              "payment=()",
              "usb=()",
              "magnetometer=()",
              "gyroscope=()",
              "accelerometer=()",
            ].join(", "),
          },

          // ── Cross-Origin Policies ──
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
