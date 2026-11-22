import { getDataStore } from "../store";
import type { DataStore, WriteOperation } from "../store/types";
import { monthOf } from "../models/common";
import {
  accountInput,
  assetInput,
  cardInput,
  categoryInput,
  contributionInput,
  debtPaymentInput,
  debtInput,
  goalInput,
  installmentPlanInput,
  investmentInput,
  provisionInput,
  recurrenceInput,
  transactionInput,
} from "../models/entities";
import { createEntityRepository } from "./entity-repository";

const byOrderThenName = (a: Record<string, unknown>, b: Record<string, unknown>) =>
  Number(a.order ?? 0) - Number(b.order ?? 0) ||
  String(a.name).localeCompare(String(b.name), "pt-BR");
const byName = (a: Record<string, unknown>, b: Record<string, unknown>) =>
  String(a.name).localeCompare(String(b.name), "pt-BR");

/** Campos calculados pelo servidor (Cloud Functions), somente leitura no app. */
export interface AccountServerFields {
  currentBalance: number;
  projectedBalance: number;
}
export interface CardServerFields {
  usedLimit: number;
  availableLimit: number;
  currentInvoiceMonth: string;
}
export interface GoalServerFields {
  currentAmount: number;
  suggestedMonthly: number;
  achievedAt: Date | null;
}
export interface ProvisionServerFields {
  accumulatedAmount: number;
  suggestedMonthly: number;
  status: "on_track" | "behind" | "completed" | "overdue";
}
export interface DebtServerFields {
  installmentsPaid: number;
  payoffPriority: number;
  status: "active" | "negotiating" | "paid_off" | "overdue";
}
export interface InvestmentServerFields {
  investedAmount: number;
}
/** Gravado pelo app a cada atualização do valor atual. */
export interface InvestmentDerivedFields {
  lastValuationAt: Date;
}
/** Derivados da data, gravados pelo app em toda escrita. */
export interface TransactionDerivedFields {
  month: string;
  currency: "BRL";
}
export interface TransactionServerFields {
  ai: { categorized: boolean; confidence: number; model: string };
}

/** Repositórios de todas as entidades que o usuário cadastra. */
function writtenAt(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof value.toMillis === "function"
  )
    return Number(value.toMillis());
  return Number.MAX_SAFE_INTEGER;
}

export function createRepositories(getStore: () => Promise<DataStore> = getDataStore) {
  const contributionRepositories = new Map<string, ContributionRepository>();
  const paymentRepositories = new Map<string, DebtPaymentRepository>();
  return {
    categories: createEntityRepository(getStore, {
      collection: "categories",
      schema: categoryInput,
      sort: byOrderThenName,
      label: "a categoria",
    }),
    accounts: createEntityRepository<typeof accountInput, AccountServerFields>(getStore, {
      collection: "accounts",
      schema: accountInput,
      sort: byOrderThenName,
      label: "a conta",
    }),
    cards: createEntityRepository<typeof cardInput, CardServerFields>(getStore, {
      collection: "cards",
      schema: cardInput,
      sort: byName,
      label: "o cartão",
    }),
    transactions: createEntityRepository<
      typeof transactionInput,
      TransactionServerFields,
      TransactionDerivedFields
    >(getStore, {
      collection: "transactions",
      schema: transactionInput,
      // Mais recentes primeiro.
      sort: (a, b) => String(b.date).localeCompare(String(a.date)),
      derive: (data) => ({ currency: "BRL", month: monthOf(data.date) }),
      label: "o lançamento",
    }),
    goals: createEntityRepository<typeof goalInput, GoalServerFields>(getStore, {
      collection: "goals",
      schema: goalInput,
      sort: (a, b) => Number(a.priority) - Number(b.priority) || byName(a, b),
      label: "a meta",
    }),
    provisions: createEntityRepository<typeof provisionInput, ProvisionServerFields>(getStore, {
      collection: "provisions",
      schema: provisionInput,
      sort: (a, b) => String(a.dueDate).localeCompare(String(b.dueDate)),
      label: "o provisionamento",
    }),
    debts: createEntityRepository<typeof debtInput, DebtServerFields>(getStore, {
      collection: "debts",
      schema: debtInput,
      sort: (a, b) => Number(b.monthlyRate) - Number(a.monthlyRate),
      label: "a dívida",
    }),
    investments: createEntityRepository<
      typeof investmentInput,
      InvestmentServerFields,
      InvestmentDerivedFields
    >(getStore, {
      collection: "investments",
      schema: investmentInput,
      sort: byName,
      // A data da avaliação acompanha cada gravação do valor atual.
      derive: () => ({ lastValuationAt: new Date() }),
      label: "o investimento",
    }),
    assets: createEntityRepository(getStore, {
      collection: "assets",
      schema: assetInput,
      sort: byName,
      label: "o bem",
    }),
    installmentPlans: createEntityRepository(getStore, {
      collection: "installmentPlans",
      schema: installmentPlanInput,
      sort: (a, b) => String(b.firstDate).localeCompare(String(a.firstDate)),
      label: "o parcelamento",
    }),
    recurrences: createEntityRepository(getStore, {
      collection: "recurrences",
      schema: recurrenceInput,
      sort: (a, b) => String(a.description).localeCompare(String(b.description), "pt-BR"),
      label: "a recorrência",
    }),
    /** Aportes de um provisionamento (users/{uid}/provisions/{id}/contributions). */
    provisionContributions(provisionId: string) {
      let repository = contributionRepositories.get(provisionId);
      if (!repository) {
        repository = createEntityRepository(getStore, {
          collection: `provisions/${provisionId}/contributions`,
          schema: contributionInput,
          sort: (a, b) => String(b.date).localeCompare(String(a.date)),
          label: "o aporte",
        });
        contributionRepositories.set(provisionId, repository);
      }
      return repository;
    },
    /** Pagamentos de uma dívida (users/{uid}/debts/{id}/payments). */
    debtPayments(debtId: string) {
      let repository = paymentRepositories.get(debtId);
      if (!repository) {
        repository = createEntityRepository(getStore, {
          collection: `debts/${debtId}/payments`,
          schema: debtPaymentInput,
          // Mais recente primeiro; no mesmo dia, o último registrado (pendente de gravação conta como o mais novo).
          sort: (a, b) =>
            String(b.date).localeCompare(String(a.date)) ||
            writtenAt(b.createdAt) - writtenAt(a.createdAt),
          label: "o pagamento",
        });
        paymentRepositories.set(debtId, repository);
      }
      return repository;
    },
    /** Grava várias operações de uma vez (tudo ou nada em cada lote). */
    async commit(operations: WriteOperation[]): Promise<void> {
      if (operations.length === 0) return;
      const store = await getStore();
      // O Firestore aceita até 500 operações por lote.
      for (let index = 0; index < operations.length; index += 450) {
        await store.batch(operations.slice(index, index + 450));
      }
    },
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
type ContributionRepository = ReturnType<typeof createEntityRepository<typeof contributionInput>>;
type DebtPaymentRepository = ReturnType<typeof createEntityRepository<typeof debtPaymentInput>>;

let shared: Repositories | null = null;

/** Repositórios do app (compartilhados). */
export function getRepositories(): Repositories {
  shared ??= createRepositories();
  return shared;
}
