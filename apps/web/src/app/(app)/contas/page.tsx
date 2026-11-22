import { screenMetadata } from "@/config/screens";
import { AccountsPage } from "@/features/accounts/components/accounts-page";

export const metadata = screenMetadata("contas");

export default function Page() {
  return <AccountsPage />;
}
