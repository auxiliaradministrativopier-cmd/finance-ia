"use client";

import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import { getCashFlowService, useCashFlowData } from "../use-cash-flow";
import type { EntryType, Transaction } from "../types";
import { EntryForm } from "./entry-form";

export interface EntrySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  defaultType?: EntryType;
}

/** Folha de lançamento: abre do botão "+" de qualquer tela ou ao tocar num lançamento. */
export function EntrySheet({
  open,
  onOpenChange,
  transaction = null,
  defaultType = "expense",
}: EntrySheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        transaction
          ? transaction.type === "income"
            ? "Editar receita"
            : "Editar despesa"
          : "Novo lançamento"
      }
      description={transaction ? undefined : "Registre uma movimentação em segundos."}
    >
      {open ? (
        <EntrySheetBody
          transaction={transaction}
          defaultType={defaultType}
          onDone={() => onOpenChange(false)}
        />
      ) : null}
    </Sheet>
  );
}

function EntrySheetBody({
  transaction,
  defaultType,
  onDone,
}: {
  transaction: Transaction | null;
  defaultType: EntryType;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const data = useCashFlowData();
  const toast = useToast();
  const service = getCashFlowService();

  if (!user || data.status !== "ready" || !data.context) {
    return (
      <p className="py-8 text-center text-body text-ink-muted">
        {data.status === "error" ? data.error?.message : "Carregando…"}
      </p>
    );
  }
  const context = data.context;

  return (
    <EntryForm
      key={transaction?.id ?? "new"}
      uid={user.uid}
      today={data.today}
      accounts={data.accounts}
      cards={data.cards}
      categories={data.categories}
      transaction={transaction}
      defaultType={defaultType}
      onCancel={onDone}
      onCreate={async (draft) => {
        await service.create(draft, context);
        const what = draft.type === "income" ? "Receita" : "Despesa";
        toast({
          title:
            draft.repeat.kind === "installments"
              ? `${what} parcelada em ${draft.repeat.count}x salva.`
              : draft.repeat.kind === "recurring"
                ? `${what} recorrente salva.`
                : `${what} salva.`,
        });
        onDone();
      }}
      onUpdate={async (changes, scope) => {
        if (!transaction) return;
        await service.update(transaction, changes, scope, context, data.transactions);
        toast({ title: "Lançamento atualizado." });
        onDone();
      }}
      onDelete={async (scope) => {
        if (!transaction) return;
        const ids = await service.remove(transaction, scope, context, data.transactions);
        onDone();
        toast({
          title: ids.length > 1 ? `${ids.length} lançamentos excluídos.` : "Lançamento excluído.",
          action:
            scope === "one"
              ? { label: "Desfazer", onClick: () => void service.restore(user.uid, ids) }
              : undefined,
        });
      }}
    />
  );
}
