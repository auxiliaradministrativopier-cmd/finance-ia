import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    // Fronteiras entre módulos: componente usado por mais de um módulo mora em src/components.
    // Exceções: o módulo de autenticação (base de todos) e o layout do app, que compõe as telas.
    files: [
      "src/features/**/*.{ts,tsx}",
      "src/components/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
      "src/lib/**/*.{ts,tsx}",
    ],
    ignores: ["src/components/layout/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*/components/*", "!@/features/auth/components/*"],
              message:
                "Não importe componentes internos de outro módulo. Mova o componente para src/components.",
            },
          ],
        },
      ],
    },
  },
  {
    // Testes de ponta a ponta imprimem relatórios (ex.: tabela de performance).
    files: ["e2e/**"],
    rules: { "no-console": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
]);

export default eslintConfig;
