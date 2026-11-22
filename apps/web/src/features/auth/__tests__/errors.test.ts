import { AuthError, toAuthError } from "../errors";

describe("toAuthError", () => {
  it("usa a mesma mensagem neutra para e-mail inexistente e senha errada", () => {
    const notFound = toAuthError({ code: "auth/user-not-found" });
    const wrong = toAuthError({ code: "auth/wrong-password" });
    expect(notFound.message).toBe("E-mail ou senha incorretos.");
    expect(wrong.message).toBe(notFound.message);
  });

  it("traduz erros conhecidos e usa uma mensagem genérica para o resto", () => {
    expect(toAuthError({ code: "auth/too-many-requests" }).code).toBe("too-many-requests");
    expect(toAuthError(new Error("boom")).code).toBe("unknown");
  });

  it("trata o fechamento da janela do Google como silencioso", () => {
    expect(toAuthError({ code: "auth/popup-closed-by-user" }).isSilent).toBe(true);
  });

  it("mantém um AuthError existente", () => {
    const error = new AuthError("network");
    expect(toAuthError(error)).toBe(error);
  });
});
