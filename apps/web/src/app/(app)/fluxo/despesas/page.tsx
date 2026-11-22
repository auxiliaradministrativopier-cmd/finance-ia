import { screenMetadata } from "@/config/screens";
import { CashFlowPage } from "@/features/cash-flow/components/cash-flow-page";

export const metadata = screenMetadata("despesas");

export default function Page() {
  return <CashFlowPage type="expense" />;
}
