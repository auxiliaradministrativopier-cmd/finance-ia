import { z } from "zod";
import { entityId } from "./common";

/** Perfil (Modelo de Dados 4.1): campos que o próprio usuário pode alterar. */
export const profileUpdate = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, "Informe seu nome, com pelo menos 2 letras.")
      .max(80, "Use no máximo 80 caracteres."),
    photoUrl: z.string().max(1000).nullable(),
    occupationType: z.enum([
      "clt",
      "autonomo",
      "mei",
      "servidor",
      "empresario",
      "estudante",
      "aposentado",
      "outro",
    ]),
    incomeRange: z.enum(["ate_2k", "2k_5k", "5k_10k", "10k_20k", "acima_20k"]),
    financialProfile: z.enum(["conservador", "moderado", "arrojado"]),
    onboarding: z.object({ completed: z.boolean(), step: z.number().int().min(0).max(10) }),
  })
  .partial();

export type ProfileUpdate = z.input<typeof profileUpdate>;

export interface UserProfile {
  displayName: string;
  email: string;
  photoUrl: string | null;
  occupationType: string | null;
  incomeRange: string | null;
  financialProfile: string | null;
  onboarding: { completed: boolean; step: number };
  plan: { id: "free" | "premium"; status: string } | null;
  createdAt: Date | null;
}

/** Configurações (Modelo de Dados 4.2). */
export const preferencesSchema = z.object({
  theme: z.enum(["system", "light", "dark"]),
  locale: z.literal("pt-BR"),
  currency: z.literal("BRL"),
  timezone: z.string().min(1).max(64),
  hideValues: z.boolean(),
  monthStartDay: z
    .number()
    .int()
    .min(1, "Use um dia entre 1 e 28.")
    .max(28, "Use um dia entre 1 e 28."),
  defaultAccountId: entityId.nullable(),
  notifications: z.object({
    push: z.boolean(),
    email: z.boolean(),
    inApp: z.boolean(),
    types: z.record(z.string(), z.boolean()),
  }),
  ai: z.object({
    enabled: z.boolean(),
    insightsFrequency: z.enum(["daily", "weekly", "off"]),
    autoCategorize: z.boolean(),
  }),
  security: z.object({ appLock: z.boolean(), biometric: z.boolean() }),
  privacy: z.object({ analyticsConsent: z.boolean(), marketingConsent: z.boolean() }),
});

export type Preferences = z.output<typeof preferencesSchema>;

export function defaultPreferences(): Preferences {
  return {
    theme: "system",
    locale: "pt-BR",
    currency: "BRL",
    timezone: "America/Sao_Paulo",
    hideValues: false,
    monthStartDay: 1,
    defaultAccountId: null,
    notifications: { push: true, email: true, inApp: true, types: {} },
    ai: { enabled: true, insightsFrequency: "weekly", autoCategorize: true },
    security: { appLock: false, biometric: false },
    privacy: { analyticsConsent: false, marketingConsent: false },
  };
}

/** Atualização parcial em dois níveis: { notifications: { push: false } }. */
export type PreferencesPatch = {
  [K in keyof Preferences]?: Preferences[K] extends Record<string, unknown>
    ? Partial<Preferences[K]>
    : Preferences[K];
};
