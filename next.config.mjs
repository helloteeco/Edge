/** @type {import('next').NextConfig} */
const nextConfig = {
  // Redirects
  async redirects() {
    return [
      {
        source: '/map',
        destination: '/',
        permanent: true,
      },
    ];
  },
  // Security Headers
  async headers() {
    return [
      {
        // Sitemap and robots — serve with minimal headers for maximum crawler compatibility
        source: "/(sitemap.xml|robots.txt|api/sitemap)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=86400",
          },
        ],
      },
      {
        // Apply security headers to all OTHER routes
        source: "/((?!sitemap\\.xml|robots\\.txt|api/sitemap).*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://api.openai.com https://api.stripe.com https://*.supabase.co https://*.google.com https://*.googleapis.com wss://*.supabase.co https://api.pricelabs.co https://nominatim.openstreetmap.org",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.google.com",
              "frame-ancestors 'self'",
              "form-action 'self' https://checkout.stripe.com",
              "base-uri 'self'",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
