import { screenMetadata } from "@/config/screens";
import { DebtsPage } from "@/features/debts/components/debts-page";

export const metadata = screenMetadata("dividas");

export default function Page() {
  return <DebtsPage />;
}
