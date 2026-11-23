import { screenMetadata } from "@/config/screens";
import { PrivacyPage } from "@/features/privacy/components/privacy-page";

export const metadata = screenMetadata("privacidade");

export default function Page() {
  return <PrivacyPage />;
}
