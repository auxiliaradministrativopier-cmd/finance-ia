/**
 * Categorias padrão (Modelo de Dados 4.6), copiadas para o usuário no primeiro acesso.
 * O id vira o id do documento (idempotente) e o catalogId, usado pela IA e por estatísticas.
 * Cores são tokens de gráfico do Design System; ícones são nomes Lucide.
 */
export type CategoryType = "income" | "expense";

export type CategoryColor = "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5" | "chart-6";

export const CATEGORY_COLORS: readonly CategoryColor[] = [
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "chart-6",
];

export interface DefaultCategory {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: CategoryColor;
  /** Gasto essencial (moradia, mercado, saúde…), usado pelo IFA. */
  essential: boolean;
}

export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  {
    id: "exp-moradia",
    name: "Moradia",
    type: "expense",
    icon: "house",
    color: "chart-1",
    essential: true,
  },
  {
    id: "exp-mercado",
    name: "Mercado",
    type: "expense",
    icon: "shopping-cart",
    color: "chart-3",
    essential: true,
  },
  {
    id: "exp-alimentacao-fora",
    name: "Alimentação fora",
    type: "expense",
    icon: "utensils",
    color: "chart-5",
    essential: false,
  },
  {
    id: "exp-transporte",
    name: "Transporte",
    type: "expense",
    icon: "car",
    color: "chart-2",
    essential: true,
  },
  {
    id: "exp-saude",
    name: "Saúde",
    type: "expense",
    icon: "heart-pulse",
    color: "chart-5",
    essential: true,
  },
  {
    id: "exp-educacao",
    name: "Educação",
    type: "expense",
    icon: "graduation-cap",
    color: "chart-2",
    essential: true,
  },
  {
    id: "exp-contas",
    name: "Contas e serviços",
    type: "expense",
    icon: "receipt",
    color: "chart-6",
    essential: true,
  },
  {
    id: "exp-assinaturas",
    name: "Assinaturas",
    type: "expense",
    icon: "repeat",
    color: "chart-4",
    essential: false,
  },
  {
    id: "exp-lazer",
    name: "Lazer",
    type: "expense",
    icon: "film",
    color: "chart-4",
    essential: false,
  },
  {
    id: "exp-compras",
    name: "Compras",
    type: "expense",
    icon: "shopping-bag",
    color: "chart-3",
    essential: false,
  },
  {
    id: "exp-cuidados",
    name: "Cuidados pessoais",
    type: "expense",
    icon: "sparkle",
    color: "chart-4",
    essential: false,
  },
  {
    id: "exp-pets",
    name: "Pets",
    type: "expense",
    icon: "paw-print",
    color: "chart-3",
    essential: false,
  },
  {
    id: "exp-impostos",
    name: "Impostos e taxas",
    type: "expense",
    icon: "landmark",
    color: "chart-6",
    essential: true,
  },
  {
    id: "exp-dividas",
    name: "Dívidas e juros",
    type: "expense",
    icon: "credit-card",
    color: "chart-5",
    essential: true,
  },
  {
    id: "exp-doacoes",
    name: "Doações",
    type: "expense",
    icon: "hand-heart",
    color: "chart-1",
    essential: false,
  },
  {
    id: "exp-outros",
    name: "Outros",
    type: "expense",
    icon: "ellipsis",
    color: "chart-6",
    essential: false,
  },
  {
    id: "inc-salario",
    name: "Salário",
    type: "income",
    icon: "briefcase",
    color: "chart-1",
    essential: false,
  },
  {
    id: "inc-pro-labore",
    name: "Pró-labore",
    type: "income",
    icon: "building-2",
    color: "chart-1",
    essential: false,
  },
  {
    id: "inc-freelance",
    name: "Freelance",
    type: "income",
    icon: "laptop",
    color: "chart-2",
    essential: false,
  },
  {
    id: "inc-vendas",
    name: "Vendas",
    type: "income",
    icon: "store",
    color: "chart-3",
    essential: false,
  },
  {
    id: "inc-rendimentos",
    name: "Rendimentos",
    type: "income",
    icon: "trending-up",
    color: "chart-2",
    essential: false,
  },
  {
    id: "inc-reembolso",
    name: "Reembolso",
    type: "income",
    icon: "rotate-ccw",
    color: "chart-4",
    essential: false,
  },
  {
    id: "inc-presente",
    name: "Presente",
    type: "income",
    icon: "gift",
    color: "chart-5",
    essential: false,
  },
  {
    id: "inc-outros",
    name: "Outros",
    type: "income",
    icon: "ellipsis",
    color: "chart-6",
    essential: false,
  },
];
