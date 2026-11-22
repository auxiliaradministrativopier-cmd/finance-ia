import { AuthPlaceholder } from "@/components/feedback/auth-placeholder";
import { screenMetadata } from "@/config/screens";

export const metadata = screenMetadata("onboarding");

export default function Page() {
  return <AuthPlaceholder screen="onboarding" />;
}
