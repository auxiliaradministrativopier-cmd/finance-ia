import { getRepositories, type Repositories } from "@/data/repositories";
import { createUserRepository, type UserRepository } from "@/data/repositories/user-repository";

/** Coleções exportadas (tudo o que o usuário cadastrou). */
const COLLECTIONS = [
  "categories",
  "accounts",
  "cards",
  "transactions",
  "goals",
  "provisions",
  "debts",
  "investments",
  "assets",
  "installmentPlans",
  "recurrences",
] as const;

/**
 * Portabilidade (LGPD, art. 18, V): reúne todos os dados do usuário em um único objeto,
 * pronto para virar um arquivo JSON. Inclui itens arquivados; os excluídos ficam de fora.
 */
export async function collectUserData(
  uid: string,
  repos: Repositories = getRepositories(),
  users: UserRepository = createUserRepository(),
) {
  const [profile, preferences] = await Promise.all([
    users.getProfile(uid),
    users.getPreferences(uid),
  ]);
  const entries = await Promise.all(
    COLLECTIONS.map(
      async (name) => [name, await repos[name].list(uid, { includeArchived: true })] as const,
    ),
  );
  const data = Object.fromEntries(entries) as {
    [K in (typeof COLLECTIONS)[number]]: Awaited<ReturnType<Repositories[K]["list"]>>;
  };
  const contributions = Object.fromEntries(
    await Promise.all(
      data.provisions.map(
        async (item) => [item.id, await repos.provisionContributions(item.id).list(uid)] as const,
      ),
    ),
  );
  const payments = Object.fromEntries(
    await Promise.all(
      data.debts.map(
        async (item) => [item.id, await repos.debtPayments(item.id).list(uid)] as const,
      ),
    ),
  );
  return {
    format: "finance-ia-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    profile,
    preferences,
    ...data,
    provisionContributions: contributions,
    debtPayments: payments,
  };
}

/** Nome do arquivo: finance-ia-dados-AAAA-MM-DD.json */
export function exportFileName(today: string): string {
  return `finance-ia-dados-${today}.json`;
}
