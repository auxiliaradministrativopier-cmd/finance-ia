import { nextYearlyDueDate } from "@finance-ia/finance-core";
import { DataError } from "@/data/errors";
import type { ProvisionInput } from "@/data/models/entities";
import { getRepositories, type Repositories } from "@/data/repositories";
import type { WriteOperation } from "@/data/store/types";
import type { Provision } from "./types";

/**
 * Regras do módulo de Provisionamentos sobre a camada de dados.
 * O saldo acumulado é a soma dos aportes (subcoleção contributions); aportes não são despesas:
 * guardar dinheiro para o IPVA não é gastar, por isso não viram lançamentos do Fluxo de Caixa.
 */
export function createProvisionService(repos: Repositories = getRepositories()) {
  const { provisions } = repos;

  return {
    /** Cria o provisionamento e, se informado, o aporte inicial (o que já foi guardado), em um lote. */
    async create(
      uid: string,
      input: ProvisionInput,
      initialAmount: number,
      today: string,
    ): Promise<string> {
      if (initialAmount > input.targetAmount) {
        throw new DataError("invalid", {
          fields: { initialAmount: "O valor guardado não pode passar do total." },
        });
      }
      const provisionId = await provisions.newId(uid);
      const operations: WriteOperation[] = [
        await provisions.buildCreate(uid, input, { id: provisionId }),
      ];
      if (initialAmount > 0) {
        operations.push(
          await repos.provisionContributions(provisionId).buildCreate(uid, {
            kind: "deposit",
            amount: initialAmount,
            date: today,
            note: "Valor já guardado",
          }),
        );
      }
      await repos.commit(operations);
      return provisionId;
    },

    update(uid: string, id: string, patch: Partial<ProvisionInput>) {
      return provisions.update(uid, id, patch);
    },

    remove(uid: string, id: string) {
      return provisions.remove(uid, id);
    },

    restore(uid: string, id: string) {
      return provisions.restore(uid, id);
    },

    /** Guarda (deposit) ou usa (withdrawal) dinheiro do provisionamento. Não deixa usar mais do que há. */
    async contribute(
      uid: string,
      provisionId: string,
      entry: { kind: "deposit" | "withdrawal"; amount: number; date: string; note?: string | null },
      currentBalance: number,
    ): Promise<string> {
      if (entry.kind === "withdrawal" && entry.amount > currentBalance) {
        throw new DataError("invalid", {
          fields: { amount: "Não dá para usar mais do que está guardado." },
        });
      }
      return repos
        .provisionContributions(provisionId)
        .create(uid, { ...entry, note: entry.note ?? null });
    },

    removeContribution(uid: string, provisionId: string, contributionId: string) {
      return repos.provisionContributions(provisionId).remove(uid, contributionId);
    },

    /**
     * Renova um provisionamento anual para o ano seguinte: cria o novo (mesmo valor e dia) e arquiva
     * o atual. O que sobrou guardado vira o aporte inicial do novo ano.
     */
    async renew(
      uid: string,
      provision: Provision,
      leftover: number,
      today: string,
    ): Promise<string> {
      const input: ProvisionInput = {
        name: provision.name.replace(/\b(20\d{2})\b/, (year) => String(Number(year) + 1)),
        kind: provision.kind,
        targetAmount: provision.targetAmount,
        dueDate: nextYearlyDueDate(provision.dueDate),
        repeatsYearly: true,
        reserveAccountId: provision.reserveAccountId,
        aiSuggested: false,
      };
      const newId = await provisions.newId(uid);
      const operations: WriteOperation[] = [
        await provisions.buildCreate(uid, input, { id: newId }),
        await provisions.buildRemove(uid, provision.id),
      ];
      if (leftover > 0) {
        operations.push(
          await repos.provisionContributions(newId).buildCreate(uid, {
            kind: "deposit",
            amount: Math.min(leftover, input.targetAmount),
            date: today,
            note: "Sobra do ano anterior",
          }),
        );
      }
      await repos.commit(operations);
      return newId;
    },
  };
}

export type ProvisionService = ReturnType<typeof createProvisionService>;
