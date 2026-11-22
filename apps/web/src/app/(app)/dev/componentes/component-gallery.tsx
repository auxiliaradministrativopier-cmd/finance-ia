"use client";

import {
  Check,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Amount } from "@/components/ui/amount";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle, Overline } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-h2">{title}</h2>
      {children}
    </section>
  );
}

export function ComponentGallery() {
  const toast = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [period, setPeriod] = useState("mes");

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Design System"
        title="Componentes básicos"
        description="Vitrine dos componentes da base do Finance IA, nos temas claro e escuro. Os valores abaixo são exemplos."
        actions={<ThemeToggle />}
      />

      <Section title="Botões">
        <div className="flex flex-wrap items-center gap-3">
          <Button>
            <Plus aria-hidden="true" />
            Nova despesa
          </Button>
          <Button variant="secondary">Exportar relatório</Button>
          <Button variant="tertiary">Ver todas</Button>
          <Button variant="ai">
            <Sparkles aria-hidden="true" />
            Perguntar à IA
          </Button>
          <Button variant="danger">Excluir lançamento</Button>
          <Button variant="ghost" size="icon" aria-label="Buscar">
            <Search aria-hidden="true" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Filtrar</Button>
          <Button>Salvar</Button>
          <Button size="lg">Continuar</Button>
          <Button loading>Salvando</Button>
          <Button disabled>Indisponível</Button>
        </div>
      </Section>

      <Section title="Campos">
        <div className="grid gap-4 md:grid-cols-3">
          <TextField
            label="Descrição"
            placeholder="Ex.: Mercado do mês"
            hint="Aparece no extrato e nos relatórios."
          />
          <TextField
            label="E-mail"
            type="email"
            placeholder="voce@exemplo.com"
            prefix={<Mail aria-hidden="true" />}
          />
          <TextField
            label="Data de vencimento"
            defaultValue="31/02/2027"
            error="Essa data não existe. Use o formato dd/mm/aaaa."
          />
        </div>
      </Section>

      <Section title="Chips e badges">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "mes", label: "Este mês" },
            { id: "tri", label: "3 meses" },
            { id: "ano", label: "12 meses" },
          ].map((option) => (
            <Chip
              key={option.id}
              selected={period === option.id}
              onClick={() => setPeriod(option.id)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="success" icon={<Check aria-hidden="true" />}>
            Pago
          </Badge>
          <Badge tone="warning" icon={<TriangleAlert aria-hidden="true" />}>
            Vence amanhã
          </Badge>
          <Badge tone="danger" icon={<TriangleAlert aria-hidden="true" />}>
            Atrasada
          </Badge>
          <Badge tone="ai" icon={<Sparkles aria-hidden="true" />}>
            Sugerido pela IA
          </Badge>
          <Badge>Recorrente</Badge>
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid gap-4 md:grid-cols-3">
          <Card variant="highlight">
            <Overline className="text-on-deep-muted">Saldo disponível</Overline>
            <Amount cents={1845290} className="text-amount-xl font-semibold" />
            <div className="flex gap-6 text-caption text-on-deep-muted">
              <span className="flex flex-col gap-0.5">
                Entradas
                <Amount
                  cents={980000}
                  kind="income"
                  className="text-amount font-semibold text-on-deep"
                />
              </span>
              <span className="flex flex-col gap-0.5">
                Saídas
                <Amount
                  cents={621435}
                  kind="expense"
                  className="text-amount font-semibold text-on-deep"
                />
              </span>
            </div>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Orçamento do mês</CardTitle>
              <Badge tone="warning">88%</Badge>
            </CardHeader>
            <Amount cents={438000} className="text-amount-lg font-semibold" />
            <ProgressBar value={88} tone="auto" label="Orçamento usado" />
            <CardDescription>Faltam 8 dias para o fim do mês.</CardDescription>
          </Card>
          <Card variant="insight">
            <span className="flex items-center gap-1.5 text-caption font-semibold tracking-[0.02em] text-ai">
              <Sparkles className="size-4" aria-hidden="true" />
              FINANCE IA
            </span>
            <p className="text-body-lg">
              Seus insights aparecerão aqui, sempre com números reais e o próximo passo.
            </p>
            <div className="flex gap-2">
              <Button size="sm">Ver detalhes</Button>
              <Button size="sm" variant="tertiary">
                Dispensar
              </Button>
            </div>
          </Card>
        </div>
      </Section>

      <Section title="Progresso">
        <div className="grid gap-4 md:grid-cols-3">
          <ProgressBar value={60} label="Meta: 60%" />
          <ProgressBar value={94} tone="auto" label="Orçamento: 94%" />
          <ProgressBar value={118} tone="auto" label="Orçamento: 118%" />
        </div>
      </Section>

      <Section title="Carregamento e estados">
        <div className="grid items-start gap-4 md:grid-cols-2">
          <Card>
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Spinner />
            </div>
          </Card>
          <Card>
            <EmptyState
              icon={<Wallet aria-hidden="true" />}
              title="Nenhuma conta ainda"
              description="Cadastre sua primeira conta para ver seu saldo consolidado."
              action={<Button size="sm">Adicionar conta</Button>}
              className="py-4"
            />
          </Card>
        </div>
      </Section>

      <Section title="Folha, aviso e avatar">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            Abrir folha
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast({
                title: "Despesa salva",
                action: {
                  label: "Desfazer",
                  onClick: () => toast({ title: "Ação desfeita", tone: "info" }),
                },
              })
            }
          >
            Mostrar aviso
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast({ title: "Não foi possível salvar. Tente de novo.", tone: "error" })
            }
          >
            Mostrar erro
          </Button>
          <Avatar name="Juliana Souza" />
        </div>
      </Section>

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Exemplo de folha"
        description="No celular abre de baixo para cima; no desktop, centralizada."
        footer={
          <Button block size="lg" onClick={() => setSheetOpen(false)}>
            <ShieldCheck aria-hidden="true" />
            Entendi
          </Button>
        }
      >
        <p className="text-body text-ink-muted">
          A folha usa o elemento de diálogo nativo do navegador: o foco fica preso dentro dela e a
          tecla Esc fecha.
        </p>
      </Sheet>
    </div>
  );
}
