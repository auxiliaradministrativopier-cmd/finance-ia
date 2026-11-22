import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { screenMetadata } from "@/config/screens";

export const metadata = screenMetadata("recuperar-senha");

export default function Page() {
  return <ResetPasswordForm />;
}
