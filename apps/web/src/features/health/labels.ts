import type { HealthScore, IfaBand, PillarId, PillarResult } from "@finance-ia/finance-core";
import { formatMoney } from "@finance-ia/shared";

export const bandInfo: Record<IfaBand, { label: string; range: string; summary: string }> = {
  critical: {
    label: "Crítico",
    range: "0 a 399",
    summary:
      "Suas finanças pedem atenção agora. Comece pelas recomendações abaixo, uma de cada vez.",
  },
  attention: {
    label: "Atenção",
    range: "400 a 599",
    summary: "Há uma base, mas alguns pontos deixam você vulnerável a imprevistos.",
  },
  healthy: {
    label: "Saudável",
    range: "600 a 799",
    summary:
      "Suas finanças estão em ordem. Agora é fortalecer a reserva e fazer o dinheiro render.",
  },
  excellent: {
    label: "Excelente",
    range: "800 a 1000",
    summary: "Você controla bem o dinheiro e está preparado para o futuro. Continue assim.",
  },
};

export const pillarInfo: Record<PillarId, { label: string; icon: string; question: string }> = {
  spending: {
    label: "Controle de gastos",
    icon: "wallet",
    question: "Quanto da renda sobra no fim do mês?",
  },
  reserve: {
    label: "Reserva",
    icon: "shield-check",
    question: "Quantos meses você aguenta sem renda?",
  },
  debts: {
    label: "Dívidas",
    icon: "receipt",
    question: "Quanto da renda vai para parcelas e juros?",
  },
  payments: {
    label: "Pagamentos",
    icon: "calendar-check",
    question: "As contas são pagas em dia?",
  },
  investments: {
    label: "Investimentos",
    icon: "trending-up",
    question: "Seu dinheiro está trabalhando por você?",
  },
  goals: { label: "Metas", icon: "flag", question: "Você cumpre o que planejou guardar?" },
};

const percent = (ratio: number) => `${Math.round(ratio * 100)}%`;
const monthsText = (value: number) => {
  const rounded = Math.round(value * 10) / 10;
  if (rounded < 1) return "menos de 1 mês";
  return `${rounded.toLocaleString("pt-BR")} ${rounded === 1 ? "mês" : "meses"}`;
};

/** A frase que explica o número de cada pilar, com os dados do próprio usuário. */
export function explainPillar(pillar: PillarResult, hidden = false): string {
  const f = pillar.facts;
  const money = (cents: number) => formatMoney(cents, { hidden });
  switch (pillar.id) {
    case "spending":
      return f.savingsRate! >= 0
        ? `Sobram ${percent(f.savingsRate!)} da renda: média de ${money(f.avgIncome! - f.avgExpense!)} por mês nos últimos ${f.months} ${f.months === 1 ? "mês" : "meses"}.`
        : `As despesas passam a renda em ${percent(-f.savingsRate!)}: faltam ${money(f.avgExpense! - f.avgIncome!)} por mês, em média.`;
    case "reserve":
      return `O dinheiro em contas cobre ${monthsText(f.reserveMonths!)} de despesas. O ideal são 6 meses (${money(f.target!)}).`;
    case "debts":
      if (f.openCount === 0) return "Nenhuma dívida em aberto.";
      if (f.growingCount! > 0)
        return `${f.growingCount === 1 ? "Uma dívida tem" : `${f.growingCount} dívidas têm`} parcela menor que os juros: o saldo cresce todo mês.`;
      return `As parcelas somam ${money(f.monthlyPayments!)} por mês, ${percent(f.commitment!)} da renda${f.expensiveCount! > 0 ? ", com juros caros" : ""}.`;
    case "payments":
      if (!pillar.measured) return "Nenhuma conta a pagar registrada nos últimos 3 meses.";
      if (f.overdue! + f.late! + f.overdueDebts! === 0)
        return `Todas as ${f.bills} contas dos últimos 3 meses foram pagas em dia.`;
      return [
        f.overdue! > 0
          ? `${f.overdue} ${f.overdue === 1 ? "conta atrasada" : "contas atrasadas"}`
          : null,
        f.late! > 0 ? `${f.late} ${f.late === 1 ? "paga" : "pagas"} com atraso` : null,
        f.overdueDebts! > 0
          ? `${f.overdueDebts} ${f.overdueDebts === 1 ? "parcela de dívida vencida" : "parcelas de dívidas vencidas"}`
          : null,
      ]
        .filter(Boolean)
        .join(", ")
        .replace(/^./, (c) => c.toUpperCase())
        .concat(` em ${f.bills} contas dos últimos 3 meses.`);
    case "investments":
      return f.invested! > 0
        ? `Investido: ${money(f.invested!)}, o equivalente a ${monthsText(f.investedMonths!)} de despesas.`
        : "Nenhum investimento além da reserva ainda.";
    case "goals":
      return f.items === 0
        ? "Nenhuma meta ou provisionamento em andamento."
        : `${f.onTrack} de ${f.items} ${f.items === 1 ? "meta no ritmo" : "metas e provisionamentos no ritmo"}.`;
  }
}

export interface Recommendation {
  id: string;
  pillar: PillarId;
  title: string;
  description: string;
  href: string;
  action: string;
  /** Pontos que o pilar ainda pode ganhar (para ordenar). */
  gain: number;
}

/** Até `limit` recomendações, das que mais podem subir a nota para as que menos podem. */
export function recommendationsFor(
  score: HealthScore,
  hidden = false,
  limit = 4,
): Recommendation[] {
  const money = (cents: number) => formatMoney(cents, { hidden });
  const list: Recommendation[] = [];
  for (const pillar of score.pillars) {
    if (!pillar.measured || pillar.score >= 0.95) continue;
    const f = pillar.facts;
    const gain = pillar.maxPoints - pillar.points;
    const add = (item: Omit<Recommendation, "pillar" | "gain">) =>
      list.push({ ...item, pillar: pillar.id, gain });
    switch (pillar.id) {
      case "spending": {
        const target = Math.max(Math.round(f.avgIncome! * 0.8), 0);
        const cut = Math.max(f.avgExpense! - target, 0);
        add({
          id: "spending",
          title: f.savingsRate! < 0 ? "Feche o mês no azul" : "Guarde 20% da renda",
          description:
            cut > 0
              ? `Reduzir ${money(cut)} por mês nas despesas leva você a guardar 20% da renda. Veja as categorias que mais pesam.`
              : "Revise as categorias que mais pesam e defina um valor fixo para guardar no início do mês.",
          href: "/fluxo/despesas",
          action: "Ver despesas",
        });
        break;
      }
      case "reserve":
        add({
          id: "reserve",
          title:
            f.reserveMonths! < 1
              ? "Comece sua reserva de emergência"
              : "Complete a reserva de emergência",
          description: `A meta é ${money(f.target!)} (6 meses de despesas). Faltam ${money(Math.max(f.target! - f.reservePool!, 0))}. Separe um valor fixo todo mês em uma aplicação com resgate imediato.`,
          href: "/contas",
          action: "Ver contas",
        });
        break;
      case "debts":
        add({
          id: "debts",
          title:
            f.growingCount! > 0
              ? "Renegocie a dívida que está crescendo"
              : f.expensiveCount! > 0
                ? "Troque a dívida cara por uma mais barata"
                : "Reduza o peso das parcelas",
          description:
            f.growingCount! > 0
              ? "A parcela não cobre os juros. Procure o credor para renegociar ou troque por um empréstimo com juros menores, como o consignado."
              : f.expensiveCount! > 0
                ? "Rotativo e cheque especial têm os juros mais altos do mercado. Quitar ou trocar essa dívida é o que mais sobe sua nota."
                : `As parcelas usam ${percent(f.commitment!)} da renda. Antecipar a dívida de juros mais altos libera espaço no orçamento.`,
          href: "/patrimonio/dividas",
          action: "Ver dívidas",
        });
        break;
      case "payments":
        add({
          id: "payments",
          title:
            f.overdue! + f.overdueDebts! > 0
              ? "Regularize as contas atrasadas"
              : "Pague as contas até o vencimento",
          description:
            f.overdue! + f.overdueDebts! > 0
              ? "Contas em atraso geram multa e juros. Pague ou renegocie e marque como paga no app."
              : "Programe débito automático ou lembretes para as contas que costumam atrasar.",
          href: f.overdueDebts! > 0 && f.overdue === 0 ? "/patrimonio/dividas" : "/fluxo/despesas",
          action: "Ver contas",
        });
        break;
      case "investments":
        add({
          id: "investments",
          title: f.invested! > 0 ? "Invista com regularidade" : "Faça seu primeiro investimento",
          description:
            "Depois da reserva, o que sobra pode render mais em renda fixa, Tesouro Direto ou fundos. Cadastre seus investimentos para acompanhar.",
          href: "/patrimonio/investimentos",
          action: "Ver investimentos",
        });
        break;
      case "goals":
        add({
          id: "goals",
          title: f.items === 0 ? "Planeje uma despesa futura" : "Coloque as metas em dia",
          description:
            f.items === 0
              ? "Criar um provisionamento para IPVA, seguro ou viagem evita sustos e mostra quanto guardar por mês."
              : "Alguns provisionamentos estão abaixo do ritmo. Guardar o valor do mês recoloca tudo no prazo.",
          href: "/planejar/provisionamentos",
          action: f.items === 0 ? "Criar provisionamento" : "Ver provisionamentos",
        });
        break;
    }
  }
  return list.sort((a, b) => b.gain - a.gain).slice(0, limit);
}
