import { VerifyEmailPanel } from "@/features/auth/components/verify-email-panel";
import { screenMetadata } from "@/config/screens";

export const metadata = screenMetadata("verificar-email");

export default function Page() {
  return <VerifyEmailPanel />;
}
