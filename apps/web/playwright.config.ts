import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de ponta a ponta contra os emuladores do Firebase e um servidor falso da API de IA.
 * Rode com `pnpm e2e` (sobe tudo sozinho). Precisa de Java para os emuladores.
 */
const PORT = 3200;
const FAKE_AI_PORT = 4010;

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  // O emulador do Firestore às vezes avalia uma escrita logo após recarregar a página com o
  // login incompleto ("evaluation error" em request.auth), mesmo com as regras originais.
  // Acontece só com os emuladores; uma nova tentativa isola esse ruído dos erros reais.
  retries: 2,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    ...devices["Desktop Chrome"],
  },
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
      command: `node e2e/fake-anthropic.mjs`,
      url: `http://127.0.0.1:${FAKE_AI_PORT}/__log`,
      reuseExistingServer: !process.env.CI,
      env: { FAKE_ANTHROPIC_PORT: String(FAKE_AI_PORT) },
    },
    {
      command: `pnpm exec next dev -p ${PORT}`,
      url: `http://localhost:${PORT}/offline`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        NEXT_PUBLIC_FIREBASE_USE_EMULATORS: "true",
        NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
        ANTHROPIC_API_KEY: "sk-ant-teste-e2e",
        ANTHROPIC_BASE_URL: `http://127.0.0.1:${FAKE_AI_PORT}`,
        MAINTENANCE_SECRET: "segredo-de-teste-e2e-123",
      },
    },
  ],
});
