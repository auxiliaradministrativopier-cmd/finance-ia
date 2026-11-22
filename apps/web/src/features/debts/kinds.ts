import type { DebtInput } from "@/data/models/entities";

export type DebtType = DebtInput["type"];
export type DebtGroup = "loan" | "financing" | "card" | "installments";

/** Os quatro grupos pedidos (Empréstimos, Financiamentos, Cartões, Parcelamentos) e seus tipos. */
export const debtGroups: {
  value: DebtGroup;
  label: string;
  icon: string;
  color: string;
  types: { value: DebtType; label: string }[];
}[] = [
  {
    value: "loan",
    label: "Empréstimo",
    icon: "landmark",
    color: "chart-2",
    types: [
      { value: "personal_loan", label: "Empréstimo pessoal" },
      { value: "payroll_loan", label: "Consignado" },
      { value: "overdraft", label: "Cheque especial" },
      { value: "informal", label: "Com amigos ou família" },
    ],
  },
  {
    value: "financing",
    label: "Financiamento",
    icon: "house",
    color: "chart-1",
    types: [
      { value: "real_estate_financing", label: "Imóvel" },
      { value: "vehicle_financing", label: "Veículo" },
      { value: "student_loan", label: "Estudantil" },
    ],
  },
  {
    value: "card",
    label: "Cartão",
    icon: "credit-card",
    color: "chart-5",
    types: [
      { value: "revolving_credit", label: "Rotativo do cartão" },
      { value: "credit_card_installment", label: "Fatura parcelada" },
    ],
  },
  {
    value: "installments",
    label: "Parcelamento",
    icon: "receipt",
    color: "chart-3",
    types: [
      { value: "installment_purchase", label: "Compra parcelada (carnê, boleto)" },
      { value: "other", label: "Outro" },
    ],
  },
];

export function groupOf(type: string) {
  return (
    debtGroups.find((group) => group.types.some((item) => item.value === type)) ?? debtGroups[3]!
  );
}

export function typeLabel(type: string): string {
  return groupOf(type).types.find((item) => item.value === type)?.label ?? "Dívida";
}

export const amortizationLabels = {
  price: "Parcelas fixas (Price)",
  sac: "Parcelas decrescentes (SAC)",
  none: "Sem juros",
} as const;
