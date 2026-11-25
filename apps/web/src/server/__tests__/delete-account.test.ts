// @vitest-environment node
import { createDeleteAccountHandler, type DeleteAccountDeps } from "../account/delete-handler";

function setup(overrides: Partial<DeleteAccountDeps> = {}) {
  const deleted: string[] = [];
  const handler = createDeleteAccountHandler({
    verify: async (header) => (header === "Bearer valido" ? { uid: "u1", authTime: 0 } : null),
    appCheck: async () => true,
    signedInRecently: () => true,
    deleteAccount: async (uid) => void deleted.push(uid),
    ...overrides,
  });
  const post = (token = "valido") =>
    handler(
      new Request("http://localhost/api/conta/excluir", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
    );
  return { post, deleted };
}

describe("POST /api/conta/excluir", () => {
  it("sem login válido, recusa e não apaga nada", async () => {
    const { post, deleted } = setup();
    expect((await post("")).status).toBe(401);
    expect((await post("forjado")).status).toBe(401);
    expect(deleted).toEqual([]);
  });

  it("App Check reprovado recusa", async () => {
    const { post, deleted } = setup({ appCheck: async () => false });
    expect((await post()).status).toBe(401);
    expect(deleted).toEqual([]);
  });

  it("login antigo exige confirmar a senha de novo", async () => {
    const { post, deleted } = setup({ signedInRecently: () => false });
    const response = await post();
    expect(response.status).toBe(403);
    expect(((await response.json()) as { message: string }).message).toContain("confirme sua senha");
    expect(deleted).toEqual([]);
  });

  it("apaga só a conta de quem pediu, sem cache", async () => {
    const { post, deleted } = setup();
    const response = await post();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(deleted).toEqual(["u1"]);
  });

  it("falha interna não expõe detalhes", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { post } = setup({
      deleteAccount: async () => {
        throw new Error("segredo interno: caminho /users/u1");
      },
    });
    const response = await post();
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("segredo");
    error.mockRestore();
  });
});
