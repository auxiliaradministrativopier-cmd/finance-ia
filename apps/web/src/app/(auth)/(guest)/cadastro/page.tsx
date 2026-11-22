import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { screenMetadata } from "@/config/screens";

export const metadata = screenMetadata("cadastro");

export default function Page() {
  return <SignUpForm />;
}
