import type { ProvisionInput } from "@/data/models/entities";

export type ProvisionKind = ProvisionInput["kind"];

/** Tipos de provisionamento: rótulo, ícone (Lucide) e cor do Design System. */
export const provisionKinds: {
  value: ProvisionKind;
  label: string;
  icon: string;
  color: string;
  yearly: boolean;
}[] = [
  { value: "ipva", label: "IPVA", icon: "car", color: "chart-2", yearly: true },
  { value: "iptu", label: "IPTU", icon: "house", color: "chart-1", yearly: true },
  { value: "seguro", label: "Seguro", icon: "shield-check", color: "chart-2", yearly: true },
  { value: "ferias", label: "Viagem", icon: "plane", color: "chart-4", yearly: false },
  {
    value: "material_escolar",
    label: "Material escolar",
    icon: "backpack",
    color: "chart-3",
    yearly: true,
  },
  {
    value: "escola",
    label: "Matrícula escolar",
    icon: "graduation-cap",
    color: "chart-3",
    yearly: true,
  },
  { value: "manutencao", label: "Manutenção", icon: "wrench", color: "chart-6", yearly: false },
  {
    value: "imposto_renda",
    label: "Imposto de Renda",
    icon: "file-text",
    color: "chart-5",
    yearly: true,
  },
  {
    value: "presentes",
    label: "Presentes de fim de ano",
    icon: "gift",
    color: "chart-5",
    yearly: true,
  },
  {
    value: "decimo_terceiro",
    label: "13º dos funcionários",
    icon: "briefcase",
    color: "chart-1",
    yearly: true,
  },
  { value: "outro", label: "Outro", icon: "piggy-bank", color: "chart-1", yearly: false },
];

export function kindInfo(kind: string) {
  return provisionKinds.find((item) => item.value === kind) ?? provisionKinds.at(-1)!;
}
