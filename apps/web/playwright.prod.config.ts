import { defineConfig, devices } from "@playwright/test";

/**
 * Testes contra o BUILD DE PRODUÇÃO (next build + next start), com os emuladores:
 * service worker, modo offline, manifesto, cabeçalhos de segurança e CSP sem `unsafe-eval`.
 * Rode com `pnpm e2e:prod`.
 */
const PORT = 3300;

export default defineConfig({
  testDir: "./e2e/prod",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  workers: 1,
  retries: 2,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "off", ...devices["Desktop Chrome"] },
  webServer: [
    {
      command:
        "pnpm --filter @finance-ia/firebase exec firebase emulators:start --project demo-finance-ia --only auth,firestore,storage",
      url: "http://127.0.0.1:9099",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      cwd: "../..",
    },
    {
      command: `pnpm exec next build && pnpm exec next start -p ${PORT}`,
      url: `http://localhost:${PORT}/offline`,
      reuseExistingServer: !process.env.CI,
      timeout: 400_000,
      env: {
        NEXT_PUBLIC_FIREBASE_USE_EMULATORS: "true",
        NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
      },
    },
  ],
});
