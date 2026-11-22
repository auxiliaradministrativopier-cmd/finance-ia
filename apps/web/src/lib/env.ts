import { z } from "zod";

/**
 * Variáveis públicas do app, validadas na inicialização.
 * As referências precisam ser literais (process.env.NEXT_PUBLIC_X) para o Next.js embuti-las no build.
 * Segredos de servidor nunca usam o prefixo NEXT_PUBLIC_.
 */
const optionalText = z.string().trim().min(1).optional();
const flag = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_FIREBASE_API_KEY: optionalText,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: optionalText,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: optionalText,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: optionalText,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: optionalText,
  NEXT_PUBLIC_FIREBASE_APP_ID: optionalText,
  NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY: optionalText,
  NEXT_PUBLIC_FIREBASE_USE_EMULATORS: flag,
  NEXT_PUBLIC_SHOW_DEV_PAGES: flag,
});

const blankToUndefined = (value: string | undefined) => (value?.trim() ? value : undefined);

export function parsePublicEnv(source: Record<string, string | undefined>) {
  const cleaned = Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, blankToUndefined(value)]),
  );
  return publicEnvSchema.parse(cleaned);
}

export const publicEnv = parsePublicEnv({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY: process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY,
  NEXT_PUBLIC_FIREBASE_USE_EMULATORS: process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS,
  NEXT_PUBLIC_SHOW_DEV_PAGES: process.env.NEXT_PUBLIC_SHOW_DEV_PAGES,
});

export type PublicEnv = typeof publicEnv;

export const isProduction = process.env.NODE_ENV === "production";
