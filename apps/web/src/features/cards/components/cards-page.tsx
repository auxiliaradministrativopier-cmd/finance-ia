"use client";

import {
  invoiceBalance,
  invoiceFor,
  isCardPurchase,
  isInvoicePayment,
} from "@finance-ia/finance-core";
import { Archive, ArchiveRestore, CreditCard, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { getRepositories } from "@/data/repositories";
import { useAuth } from "@/features/auth/auth-provider";
import { formatMonthTitle, formatShortDate } from "@/lib/format";
import type { Card as CardModel } from "@/features/cash-flow/types";
import { useCashFlowData } from "@/features/cash-flow/use-cash-flow";
import { createCardService, payableInvoices } from "../service";
import { brands, CardFormSheet } from "./card-form-sheet";
import { PayInvoiceSheet } from "./pay-invoice-sheet";

/** Tela 27: Cartões. Fatura e limite usado calculados pelos lançamentos (até as Cloud Functions assumirem). */
export function CardsPage() {
  const { user } = useAuth();
  const data = useCashFlowData();
  const toast = useToast();
  const [sheet, setSheet] = useState<{ open: boolean; card: CardModel | null }>({
    open: false,
    card: null,
  });

  const [paying, setPaying] = useState<CardModel | null>(null);

  const active = data.cards.filter((card) => !card.archived);
  const archived = data.cards.filter((card) => card.archived);

  const usage = useMemo(() => {
    const map = new Map<
      string,
      {
        invoice: ReturnType<typeof invoiceFor>;
        invoiceTotal: number;
        invoicePaid: number;
        used: number;
        payable: ReturnType<typeof payableInvoices>;
      }
    >();
    for (const card of data.cards) {
      const invoice = invoiceFor(data.today, card);
      const items = data.transactions.filter(
        (transaction) => transaction.cardId === card.id && transaction.invoiceMonth,
      );
      const current = invoiceBalance(items, card.id, invoice.invoiceMonth);
      const payable = payableInvoices(card, items, data.today, invoice.dueDate);
      map.set(card.id, {
        invoice,
        invoiceTotal: current.purchases,
        invoicePaid: current.paid,
        // Limite comprometido: fatura atual e futuras (parcelas incluídas), menos o que já foi pago.
        used: Math.max(
          items
            .filter((t) => (t.invoiceMonth ?? "") >= invoice.invoiceMonth)
            .reduce(
              (sum, t) =>
                sum + (isCardPurchase(t) ? t.amount : isInvoicePayment(t) ? -t.amount : 0),
              0,
            ),
          0,
        ),
        payable,
      });
    }
    return map;
  }, [data.cards, data.transactions, data.today]);

  async function setArchived(card: CardModel, value: boolean) {
    if (!user) return;
    try {
      await getRepositories().cards.update(user.uid, card.id, { archived: value });
      toast({
        title: value ? `"${card.name}" foi arquivado.` : `"${card.name}" voltou para a lista.`,
        action: value
          ? {
              label: "Desfazer",
              onClick: () =>
                void getRepositories().cards.update(user.uid, card.id, { archived: false }),
            }
          : undefined,
      });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Não foi possível atualizar.",
        tone: "error",
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cartões"
        description="Faturas e limites calculados a partir das suas compras."
        actions={
          <Button onClick={() => setSheet({ open: true, card: null })}>
            <Plus aria-hidden="true" />
            Novo cartão
          </Button>
        }
      />
      {data.status === "error" ? <Alert tone="danger">{data.error?.message}</Alert> : null}
      {data.status === "loading" ? (
        <Skeleton className="h-48 rounded-lg" />
      ) : active.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CreditCard aria-hidden="true" />}
            title="Nenhum cartão ainda"
            description="Cadastre seu cartão para acompanhar a fatura e as parcelas em tempo real."
            action={
              <Button onClick={() => setSheet({ open: true, card: null })}>Cadastrar cartão</Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {active.map((card) => {
            const info = usage.get(card.id);
            const available = card.limit - (info?.used ?? 0);
            return (
              <Card key={card.id} as="article" aria-label={card.name}>
                <div className="flex items-start gap-3">
                  <CategoryIcon icon="credit-card" color={card.color} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body font-semibold">{card.name}</span>
                    <span className="text-caption text-ink-muted">
                      {brands.find((brand) => brand.value === card.brand)?.label}
                      {card.lastFour ? ` •••• ${card.lastFour}` : ""}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Editar ${card.name}`}
                    onClick={() => setSheet({ open: true, card })}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Arquivar ${card.name}`}
                    onClick={() => setArchived(card, true)}
                  >
                    <Archive aria-hidden="true" />
                  </Button>
                </div>
                {info ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-caption text-ink-muted">
                      Fatura de {formatMonthTitle(info.invoice.invoiceMonth).toLowerCase()}
                    </span>
                    <Amount cents={info.invoiceTotal} className="text-amount-lg font-semibold" />
                    <span className="text-caption text-ink-muted">
                      Fecha em {formatShortDate(info.invoice.closingDate)} · vence em{" "}
                      {formatShortDate(info.invoice.dueDate)}
                      {info.invoicePaid > 0 ? (
                        <>
                          {" "}
                          · pago <Amount cents={info.invoicePaid} />
                        </>
                      ) : null}
                    </span>
                  </div>
                ) : null}
                {info && info.payable.length > 0 ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="self-start"
                    onClick={() => setPaying(card)}
                  >
                    Pagar fatura
                  </Button>
                ) : null}
                <div className="flex flex-col gap-1.5">
                  <ProgressBar
                    value={info?.used ?? 0}
                    max={card.limit}
                    tone="auto"
                    label={`Limite usado de ${card.name}`}
                  />
                  <span className="flex justify-between text-caption text-ink-muted">
                    <span>
                      Usado: <Amount cents={info?.used ?? 0} />
                    </span>
                    <span>
                      Disponível:{" "}
                      <Amount
                        cents={available}
                        className={available < 0 ? "text-danger" : undefined}
                      />
                    </span>
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {archived.length > 0 ? (
        <section aria-label="Cartões arquivados" className="flex flex-col gap-2">
          <h2 className="text-h3">Arquivados</h2>
          <Card className="gap-0 p-2">
            <ul>
              {archived.map((card) => (
                <li key={card.id} className="flex items-center gap-3 px-2 py-2.5 text-ink-muted">
                  <span className="min-w-0 flex-1 truncate">{card.name}</span>
                  <Button variant="tertiary" size="sm" onClick={() => setArchived(card, false)}>
                    <ArchiveRestore aria-hidden="true" />
                    Restaurar
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
      <PayInvoiceSheet
        card={paying}
        invoices={paying ? (usage.get(paying.id)?.payable ?? []) : []}
        accounts={data.accounts.filter((account) => !account.archived)}
        today={data.today}
        onOpenChange={(open) => {
          if (!open) setPaying(null);
        }}
        onSubmit={async (payment) => {
          if (!user || !paying) return;
          await createCardService().payInvoice(user.uid, paying, payment);
          toast({ title: "Fatura paga. O valor saiu da conta escolhida." });
          setPaying(null);
        }}
      />
      <CardFormSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
        card={sheet.card}
        accounts={data.accounts}
        onSubmit={async (input) => {
          if (!user) return;
          if (sheet.card) await getRepositories().cards.update(user.uid, sheet.card.id, input);
          else await getRepositories().cards.create(user.uid, input);
          toast({ title: sheet.card ? "Cartão atualizado." : "Cartão criado." });
          setSheet({ open: false, card: null });
        }}
      />
    </div>
  );
}
