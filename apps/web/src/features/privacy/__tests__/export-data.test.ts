import { createRepositories } from "@/data/repositories";
import { createUserRepository } from "@/data/repositories/user-repository";
import { createMemoryStore } from "@/data/store/memory-store";
import { ensureUserSetup } from "@/data/user-setup";
import { collectUserData, exportFileName } from "../export-data";

describe("exportação dos dados (LGPD)", () => {
  it("reúne perfil, preferências, cadastros e subcoleções", async () => {
    const store = createMemoryStore();
    const repos = createRepositories(async () => store);
    const users = createUserRepository(async () => store);
    await ensureUserSetup(store, { uid: "u1", email: "j@exemplo.com", displayName: "Juliana" });
    await repos.accounts.create("u1", {
      name: "Itaú",
      type: "checking",
      color: "chart-2",
      icon: "landmark",
      initialBalance: 1000,
      initialBalanceDate: "2026-11-01",
    });
    const provisionId = await repos.provisions.create("u1", {
      name: "IPVA 2027",
      kind: "ipva",
      targetAmount: 252000,
      dueDate: "2027-01-15",
      repeatsYearly: true,
    });
    await repos
      .provisionContributions(provisionId)
      .create("u1", { kind: "deposit", amount: 5000, date: "2026-11-02" });

    const data = await collectUserData("u1", repos, users);
    expect(data).toMatchObject({
      format: "finance-ia-export",
      version: 1,
      profile: { email: "j@exemplo.com" },
    });
    expect(data.accounts.map((item) => item.name)).toEqual(["Itaú"]);
    expect(data.categories).toHaveLength(24);
    expect(data.provisionContributions[provisionId]).toHaveLength(1);
    expect(exportFileName("2026-11-23")).toBe("finance-ia-dados-2026-11-23.json");
  });
});
