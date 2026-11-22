import { createRepositories } from "@/data/repositories";
import { createMemoryStore } from "@/data/store/memory-store";
import { createProvisionService } from "../service";
import { buildProvisionViews } from "../use-provisions";
import type { Contribution } from "../types";

const UID = "juliana";
const TODAY = "2026-11-22";
const ipva = {
  name: "IPVA 2027",
  kind: "ipva" as const,
  targetAmount: 252000,
  dueDate: "2027-01-15",
  repeatsYearly: true,
};

function setup() {
  const store = createMemoryStore();
  const repos = createRepositories(async () => store);
  return { repos, service: createProvisionService(repos) };
}

async function views(repos: ReturnType<typeof createRepositories>, today = TODAY) {
  const provisions = await repos.provisions.list(UID);
  const contributions: Record<string, Contribution[]> = {};
  for (const provision of provisions)
    contributions[provision.id] = await repos.provisionContributions(provision.id).list(UID);
  return buildProvisionViews(provisions, contributions, today);
}

describe("provisionamentos", () => {
  it("cria com o valor já guardado como primeiro aporte e calcula o mensal", async () => {
    const { repos, service } = setup();
    const id = await service.create(UID, ipva, 52000, TODAY);
    const contributions = await repos.provisionContributions(id).list(UID);
    expect(contributions).toEqual([
      expect.objectContaining({ kind: "deposit", amount: 52000, note: "Valor já guardado" }),
    ]);

    const { views: list, totals } = await views(repos);
    expect(list[0]).toMatchObject({
      balance: 52000,
      plan: { remaining: 200000, monthsLeft: 2, monthlyNeeded: 100000, status: "on_track" },
    });
    expect(totals).toMatchObject({
      monthlyNeeded: 100000,
      saved: 52000,
      target: 252000,
      openCount: 1,
    });
  });

  it("não aceita guardar mais do que o total na criação", async () => {
    const { service } = setup();
    await expect(service.create(UID, ipva, 300000, TODAY)).rejects.toMatchObject({
      fields: { initialAmount: "O valor guardado não pode passar do total." },
    });
  });

  it("guarda, usa e exclui aportes; não usa mais do que há", async () => {
    const { repos, service } = setup();
    const id = await service.create(UID, ipva, 0, TODAY);
    await service.contribute(UID, id, { kind: "deposit", amount: 126000, date: TODAY }, 0);
    await expect(
      service.contribute(UID, id, { kind: "withdrawal", amount: 200000, date: TODAY }, 126000),
    ).rejects.toMatchObject({
      fields: { amount: "Não dá para usar mais do que está guardado." },
    });
    const usedId = await service.contribute(
      UID,
      id,
      { kind: "withdrawal", amount: 26000, date: TODAY },
      126000,
    );
    expect((await views(repos)).views[0]?.balance).toBe(100000);

    await service.removeContribution(UID, id, usedId);
    expect((await views(repos)).views[0]?.balance).toBe(126000);
  });

  it("fica concluído ao atingir o total e renova para o ano seguinte com a sobra", async () => {
    const { repos, service } = setup();
    const id = await service.create(UID, ipva, 0, TODAY);
    await service.contribute(UID, id, { kind: "deposit", amount: 262000, date: TODAY }, 0);
    const [completed] = (await views(repos)).views;
    expect(completed?.plan.status).toBe("completed");

    await service.renew(UID, completed!.provision, 10000, TODAY);
    const { views: after } = await views(repos);
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({
      provision: { name: "IPVA 2028", dueDate: "2028-01-15", targetAmount: 252000 },
      balance: 10000,
    });
  });

  it("exclui e restaura", async () => {
    const { repos, service } = setup();
    const id = await service.create(UID, ipva, 0, TODAY);
    await service.remove(UID, id);
    expect(await repos.provisions.list(UID)).toHaveLength(0);
    await service.restore(UID, id);
    expect(await repos.provisions.list(UID)).toHaveLength(1);
  });
});
