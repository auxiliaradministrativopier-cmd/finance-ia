import { screenMetadata } from "@/config/screens";
import { CashFlowPage } from "@/features/cash-flow/components/cash-flow-page";

export const metadata = screenMetadata("fluxo");

export default function Page() {
  return <CashFlowPage type="all" />;
}
