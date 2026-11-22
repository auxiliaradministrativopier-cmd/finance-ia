import { screenMetadata } from "@/config/screens";
import { SettingsPage } from "@/features/settings/components/settings-page";

export const metadata = screenMetadata("configuracoes");

export default function Page() {
  return <SettingsPage />;
}
