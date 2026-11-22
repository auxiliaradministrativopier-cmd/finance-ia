import { fieldErrors, loginSchema, newPasswordSchema, signUpSchema } from "../schemas";

describe("validações de acesso", () => {
  it("exige e-mail válido e senha no login", () => {
    const result = loginSchema.safeParse({ email: "juliana", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error)).toEqual({
        email: "Informe um e-mail válido, como voce@exemplo.com.",
        password: "Informe sua senha.",
      });
    }
  });

  it("remove espaços do e-mail", () => {
    const result = loginSchema.parse({ email: "  juliana@exemplo.com ", password: "x" });
    expect(result.email).toBe("juliana@exemplo.com");
  });

  it("aplica as regras de senha nova", () => {
    expect(newPasswordSchema.safeParse("curta1").success).toBe(false);
    expect(newPasswordSchema.safeParse("somenteletras").success).toBe(false);
    expect(newPasswordSchema.safeParse("12345678").success).toBe(false);
    expect(newPasswordSchema.safeParse("financas2026").success).toBe(true);
    expect(newPasswordSchema.safeParse("ação12345").success).toBe(true);
  });

  it("exige nome e aceite dos termos no cadastro", () => {
    const result = signUpSchema.safeParse({
      name: "J",
      email: "j@exemplo.com",
      password: "financas2026",
      acceptTerms: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrors(result.error);
      expect(errors.name).toBeDefined();
      expect(errors.acceptTerms).toContain("Termos de Uso");
    }
  });
});

describe("troca de senha", () => {
  it("exige confirmação igual e senha diferente da atual", async () => {
    const { changePasswordSchema } = await import("../schemas");
    const mismatch = changePasswordSchema.safeParse({
      currentPassword: "antiga2025",
      newPassword: "financas2026",
      confirmPassword: "financas2027",
    });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success)
      expect(fieldErrors(mismatch.error).confirmPassword).toBe("As senhas não são iguais.");

    const same = changePasswordSchema.safeParse({
      currentPassword: "financas2026",
      newPassword: "financas2026",
      confirmPassword: "financas2026",
    });
    expect(same.success).toBe(false);
    if (!same.success)
      expect(fieldErrors(same.error).newPassword).toBe(
        "A nova senha precisa ser diferente da atual.",
      );
  });
});
