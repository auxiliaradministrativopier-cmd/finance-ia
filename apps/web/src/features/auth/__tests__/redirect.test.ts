import { destinationFor, safeNextPath, signInPathWithNext } from "../redirect";
import type { AuthUser } from "../types";

const user = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  uid: "u1",
  email: "j@exemplo.com",
  displayName: "Juliana",
  emailVerified: true,
  photoUrl: null,
  providerIds: ["password"],
  ...overrides,
});

describe("safeNextPath", () => {
  it("aceita apenas caminhos internos", () => {
    expect(safeNextPath("/cartoes/123")).toBe("/cartoes/123");
    expect(safeNextPath("https://site-malicioso.com")).toBeNull();
    expect(safeNextPath("//site-malicioso.com")).toBeNull();
    expect(safeNextPath("/\\site-malicioso.com")).toBeNull();
    expect(safeNextPath("javascript:alert(1)")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });

  it("não devolve o usuário para as próprias telas de acesso", () => {
    expect(safeNextPath("/entrar")).toBeNull();
    expect(safeNextPath("/cadastro")).toBeNull();
  });
});

describe("destinationFor", () => {
  it("sem sessão vai para as boas-vindas", () => {
    expect(destinationFor(null)).toBe("/boas-vindas");
  });

  it("e-mail não confirmado vai para a verificação, mesmo com next", () => {
    expect(destinationFor(user({ emailVerified: false }), "/cartoes")).toBe("/verificar-email");
  });

  it("usuário verificado vai para a página pedida ou para o início", () => {
    expect(destinationFor(user(), "/cartoes")).toBe("/cartoes");
    expect(destinationFor(user(), "//evil.com")).toBe("/inicio");
    expect(destinationFor(user())).toBe("/inicio");
  });
});

describe("signInPathWithNext", () => {
  it("guarda a página pedida para voltar depois do login", () => {
    expect(signInPathWithNext("/planejar/metas")).toBe("/entrar?next=%2Fplanejar%2Fmetas");
    expect(signInPathWithNext("/inicio")).toBe("/entrar");
  });
});

describe("redirecionamento seguro (open redirect)", () => {
  it.each([
    ["tabulação", "/\t/evil.com"],
    ["quebra de linha", "/\n/evil.com"],
    ["retorno de carro", "/\r/evil.com"],
    ["espaço", "/ /evil.com"],
    ["barra dupla", "//evil.com"],
    ["barra invertida", "/\\evil.com"],
    ["URL absoluta", "https://evil.com"],
  ])("recusa %s", (_label, raw) => {
    expect(safeNextPath(raw)).toBeNull();
  });

  it("aceita caminhos internos", () => {
    expect(safeNextPath("/fluxo/despesas?mes=2026-11")).toBe("/fluxo/despesas?mes=2026-11");
  });
});
