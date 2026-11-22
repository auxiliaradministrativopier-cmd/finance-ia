import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Os testes compartilham o mesmo emulador.
    fileParallelism: false,
    testTimeout: 15000,
  },
});
