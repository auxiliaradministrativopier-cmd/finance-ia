import { screenMetadata } from "@/config/screens";
import { CashFlowPage } from "@/features/cash-flow/components/cash-flow-page";

export const metadata = screenMetadata("receitas");

export default function Page() {
  return <CashFlowPage type="income" />;
}
