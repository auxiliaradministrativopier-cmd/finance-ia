import { z } from "zod";

/** Validações das telas de acesso (Mapa de Telas: 03, 04 e 06). */
export const emailSchema = z
  .string()
  .trim()
  .min(1, "Informe seu e-mail.")
  .pipe(z.email("Informe um e-mail válido, como voce@exemplo.com."));

export const passwordRules = [
  { id: "length", label: "Pelo menos 8 caracteres", test: (value: string) => value.length >= 8 },
  { id: "letter", label: "Uma letra", test: (value: string) => /\p{L}/u.test(value) },
  { id: "number", label: "Um número", test: (value: string) => /\d/.test(value) },
] as const;

export const newPasswordSchema = z
  .string()
  .max(128, "Use no máximo 128 caracteres.")
  .refine((value) => passwordRules.every((rule) => rule.test(value)), {
    message: "A senha precisa ter pelo menos 8 caracteres, uma letra e um número.",
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha."),
});

export const signUpSchema = z.object({
  name: z.lazy(() => displayNameSchema),
  email: emailSchema,
  password: newPasswordSchema,
  acceptTerms: z.literal(true, {
    error: "Para continuar, aceite os Termos de Uso e a Política de Privacidade.",
  }),
});

export const resetPasswordSchema = z.object({ email: emailSchema });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe sua senha atual."),
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, "Repita a nova senha."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não são iguais.",
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ["newPassword"],
    message: "A nova senha precisa ser diferente da atual.",
  });

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Informe seu nome, com pelo menos 2 letras.")
  .max(80, "Use no máximo 80 caracteres.");

export type LoginValues = z.infer<typeof loginSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/** Converte os erros do Zod em { campo: mensagem }, mantendo a primeira mensagem de cada campo. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}
