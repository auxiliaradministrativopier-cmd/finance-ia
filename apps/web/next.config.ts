import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy: só carrega e conversa com o próprio app, Firebase e Google
 * (login, reCAPTCHA do App Check). Em desenvolvimento libera os emuladores e o recarregamento.
 * Scripts inline continuam permitidos porque o Next.js os usa na hidratação (ver ADR-16).
 */
const local = isDev
  ? ["http://127.0.0.1:*", "http://localhost:*", "ws://127.0.0.1:*", "ws://localhost:*"]
  : [];
const csp = [
  ["default-src", "'self'"],
  [
    "script-src",
    "'self'",
    "'unsafe-inline'",
    ...(isDev ? ["'unsafe-eval'"] : []),
    "https://apis.google.com",
    "https://www.google.com/recaptcha/",
    "https://www.gstatic.com/recaptcha/",
  ],
  ["style-src", "'self'", "'unsafe-inline'"],
  [
    "img-src",
    "'self'",
    "data:",
    "blob:",
    "https://firebasestorage.googleapis.com",
    "https://*.googleusercontent.com",
    ...local,
  ],
  ["font-src", "'self'", "data:"],
  [
    "connect-src",
    "'self'",
    "https://*.googleapis.com",
    "https://*.firebaseio.com",
    "wss://*.firebaseio.com",
    "https://*.firebaseapp.com",
    "https://www.google.com",
    ...local,
  ],
  [
    "frame-src",
    "https://*.firebaseapp.com",
    "https://*.web.app",
    "https://www.google.com",
    "https://recaptcha.google.com",
    ...local,
  ],
  ["worker-src", "'self'"],
  ["manifest-src", "'self'"],
  ["object-src", "'none'"],
  ["base-uri", "'self'"],
  ["form-action", "'self'"],
  ["frame-ancestors", "'none'"],
  ...(isDev ? [] : [["upgrade-insecure-requests"]]),
]
  .map((directive) => directive.join(" "))
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // O pacote compartilhado é publicado como TypeScript e compilado pelo Next.
  transpilePackages: ["@finance-ia/shared", "@finance-ia/finance-core"],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // O service worker nunca fica em cache, para que atualizações cheguem na hora.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
