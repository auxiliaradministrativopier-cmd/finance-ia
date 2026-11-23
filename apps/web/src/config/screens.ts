import type { Metadata } from "next";

/**
 * Registro das telas do Finance IA (Mapa de Telas v1.0).
 * Cada rota do app aponta para uma entrada daqui; as telas são implementadas por fase.
 */
export type ScreenGroup =
  | "acesso"
  | "onboarding"
  | "inicio"
  | "fluxo"
  | "contas-cartoes"
  | "planejamento"
  | "patrimonio"
  | "inteligencia"
  | "conta";

export interface ScreenDefinition {
  /** Número da tela no Mapa de Telas. */
  number: string;
  title: string;
  /** Objetivo da tela, exibido enquanto ela não é implementada. */
  objective: string;
  route: string;
  group: ScreenGroup;
  /** Fase do roadmap em que a tela será construída. */
  phase: 1 | 2 | 3 | 4;
}

export const screens = {
  "boas-vindas": {
    number: "02",
    title: "Boas-vindas",
    objective: "Apresentar a proposta de valor a quem nunca usou o app.",
    route: "/boas-vindas",
    group: "acesso",
    phase: 1,
  },
  entrar: {
    number: "03",
    title: "Entrar",
    objective: "Entrar de forma rápida e segura.",
    route: "/entrar",
    group: "acesso",
    phase: 1,
  },
  cadastro: {
    number: "04",
    title: "Criar conta",
    objective: "Criar a conta com o mínimo de atrito e o consentimento registrado.",
    route: "/cadastro",
    group: "acesso",
    phase: 1,
  },
  "verificar-email": {
    number: "05",
    title: "Verificação de e-mail",
    objective: "Confirmar que o e-mail pertence ao usuário.",
    route: "/verificar-email",
    group: "acesso",
    phase: 1,
  },
  "recuperar-senha": {
    number: "06",
    title: "Recuperar senha",
    objective: "Redefinir a senha com segurança.",
    route: "/recuperar-senha",
    group: "acesso",
    phase: 1,
  },
  "dois-fatores": {
    number: "07",
    title: "Verificação em duas etapas",
    objective: "Confirmar a identidade quando a verificação em duas etapas está ativa.",
    route: "/dois-fatores",
    group: "acesso",
    phase: 1,
  },
  onboarding: {
    number: "09–12",
    title: "Primeiros passos",
    objective: "Conhecer o usuário, cadastrar a primeira conta e revelar o primeiro IFA.",
    route: "/onboarding",
    group: "onboarding",
    phase: 3,
  },

  inicio: {
    number: "13",
    title: "Início",
    objective: "Mostrar em 5 segundos como você está e o que fazer em seguida.",
    route: "/inicio",
    group: "inicio",
    phase: 1,
  },
  notificacoes: {
    number: "14",
    title: "Notificações",
    objective: "Concentrar alertas e lembretes.",
    route: "/notificacoes",
    group: "inicio",
    phase: 1,
  },
  busca: {
    number: "15",
    title: "Busca",
    objective: "Encontrar qualquer lançamento, conta, meta ou conteúdo.",
    route: "/busca",
    group: "inicio",
    phase: 3,
  },

  fluxo: {
    number: "16",
    title: "Fluxo financeiro",
    objective: "Ver o extrato completo e a projeção do caixa.",
    route: "/fluxo",
    group: "fluxo",
    phase: 1,
  },
  receitas: {
    number: "17",
    title: "Receitas",
    objective: "Acompanhar tudo o que entra.",
    route: "/fluxo/receitas",
    group: "fluxo",
    phase: 1,
  },
  despesas: {
    number: "18",
    title: "Despesas",
    objective: "Entender para onde vai o dinheiro.",
    route: "/fluxo/despesas",
    group: "fluxo",
    phase: 1,
  },
  lancamento: {
    number: "20",
    title: "Detalhe do lançamento",
    objective: "Ver, corrigir ou entender um lançamento.",
    route: "/lancamentos/[id]",
    group: "fluxo",
    phase: 1,
  },
  recorrencias: {
    number: "22",
    title: "Recorrências",
    objective: "Gerenciar o que se repete: salário, aluguel, assinaturas.",
    route: "/fluxo/recorrencias",
    group: "fluxo",
    phase: 1,
  },
  categorias: {
    number: "23",
    title: "Categorias",
    objective: "Personalizar a organização dos gastos.",
    route: "/fluxo/categorias",
    group: "fluxo",
    phase: 1,
  },

  contas: {
    number: "24",
    title: "Contas",
    objective: "Ver o saldo de cada conta e o total.",
    route: "/contas",
    group: "contas-cartoes",
    phase: 1,
  },
  conta: {
    number: "25",
    title: "Detalhe da conta",
    objective: "Acompanhar o extrato e a evolução de uma conta.",
    route: "/contas/[id]",
    group: "contas-cartoes",
    phase: 1,
  },
  cartoes: {
    number: "27",
    title: "Cartões",
    objective: "Controlar faturas e limites de todos os cartões.",
    route: "/cartoes",
    group: "contas-cartoes",
    phase: 1,
  },
  cartao: {
    number: "28",
    title: "Detalhe do cartão",
    objective: "Entender e conferir cada fatura.",
    route: "/cartoes/[id]",
    group: "contas-cartoes",
    phase: 1,
  },

  planejar: {
    number: "31",
    title: "Planejar",
    objective: "Reunir tudo o que olha para o futuro.",
    route: "/planejar",
    group: "planejamento",
    phase: 2,
  },
  orcamento: {
    number: "32",
    title: "Orçamento mensal",
    objective: "Definir e acompanhar limites de gasto por categoria.",
    route: "/planejar/orcamento",
    group: "planejamento",
    phase: 2,
  },
  provisionamentos: {
    number: "33",
    title: "Provisionamentos",
    objective: "Se preparar para os gastos que não são mensais.",
    route: "/planejar/provisionamentos",
    group: "planejamento",
    phase: 2,
  },
  metas: {
    number: "35",
    title: "Metas",
    objective: "Realizar seus objetivos com um plano claro.",
    route: "/planejar/metas",
    group: "planejamento",
    phase: 2,
  },
  meta: {
    number: "36",
    title: "Detalhe da meta",
    objective: "Acompanhar e acelerar uma meta.",
    route: "/planejar/metas/[id]",
    group: "planejamento",
    phase: 2,
  },

  patrimonio: {
    number: "38",
    title: "Patrimônio",
    objective: "Mostrar a fotografia completa da sua vida financeira.",
    route: "/patrimonio",
    group: "patrimonio",
    phase: 2,
  },
  dividas: {
    number: "39",
    title: "Dívidas",
    objective: "Organizar e acelerar a quitação das dívidas.",
    route: "/patrimonio/dividas",
    group: "patrimonio",
    phase: 1,
  },
  divida: {
    number: "40",
    title: "Detalhe da dívida",
    objective: "Ver a evolução, o percentual pago e simular antecipações.",
    route: "/patrimonio/dividas/[id]",
    group: "patrimonio",
    phase: 1,
  },
  investimentos: {
    number: "41",
    title: "Investimentos",
    objective: "Acompanhar a carteira de forma simples.",
    route: "/patrimonio/investimentos",
    group: "patrimonio",
    phase: 2,
  },
  bens: {
    number: "43",
    title: "Bens",
    objective: "Registrar os bens que compõem o patrimônio.",
    route: "/patrimonio/bens",
    group: "patrimonio",
    phase: 2,
  },

  "saude-financeira": {
    number: "44",
    title: "Saúde Financeira",
    objective: "Mostrar sua nota financeira, o porquê dela e como melhorar.",
    route: "/saude-financeira",
    group: "inteligencia",
    phase: 1,
  },
  ia: {
    number: "46",
    title: "Assistente IA",
    objective: "Responder qualquer dúvida financeira com base nos seus dados reais.",
    route: "/ia",
    group: "inteligencia",
    phase: 1,
  },
  "ia-historico": {
    number: "47",
    title: "Histórico de conversas",
    objective: "Retomar conversas anteriores com a IA.",
    route: "/ia/historico",
    group: "inteligencia",
    phase: 3,
  },
  "ia-insights": {
    number: "48",
    title: "Insights",
    objective: "Reunir todas as análises e sugestões da IA.",
    route: "/ia/insights",
    group: "inteligencia",
    phase: 3,
  },
  aprender: {
    number: "49",
    title: "Aprender",
    objective: "Ensinar finanças com base na sua situação real.",
    route: "/aprender",
    group: "inteligencia",
    phase: 4,
  },
  relatorios: {
    number: "50",
    title: "Relatórios",
    objective: "Analisar períodos e exportar seus dados.",
    route: "/relatorios",
    group: "inteligencia",
    phase: 2,
  },

  perfil: {
    number: "52",
    title: "Perfil",
    objective: "Central da sua conta.",
    route: "/perfil",
    group: "conta",
    phase: 1,
  },
  configuracoes: {
    number: "53",
    title: "Configurações",
    objective: "Ajustar o app ao seu jeito.",
    route: "/configuracoes",
    group: "conta",
    phase: 1,
  },
  seguranca: {
    number: "54",
    title: "Segurança",
    objective: "Proteger sua conta.",
    route: "/configuracoes/seguranca",
    group: "conta",
    phase: 1,
  },
  "preferencias-notificacao": {
    number: "55",
    title: "Notificações",
    objective: "Controlar o que, como e quando você é avisado.",
    route: "/configuracoes/notificacoes",
    group: "conta",
    phase: 3,
  },
  privacidade: {
    number: "56",
    title: "Privacidade e dados",
    objective: "Dar a você controle total sobre seus dados.",
    route: "/configuracoes/privacidade",
    group: "conta",
    phase: 1,
  },
  planos: {
    number: "57",
    title: "Planos e assinatura",
    objective: "Conhecer o Premium e gerenciar sua assinatura.",
    route: "/planos",
    group: "conta",
    phase: 4,
  },
  ajuda: {
    number: "58",
    title: "Ajuda",
    objective: "Resolver dúvidas sem atrito.",
    route: "/ajuda",
    group: "conta",
    phase: 4,
  },
} as const satisfies Record<string, ScreenDefinition>;

export type ScreenId = keyof typeof screens;

export function getScreen(id: ScreenId): ScreenDefinition {
  return screens[id];
}

export function screenMetadata(id: ScreenId): Metadata {
  const screen = screens[id];
  return { title: screen.title, description: screen.objective };
}

/** A tela da rota já está disponível (fase 1)? Telas de fases futuras ainda são esboços. */
export function isScreenAvailable(route: string): boolean {
  return Object.values(screens).some(
    (screen: ScreenDefinition) => screen.route === route && screen.phase === 1,
  );
}
