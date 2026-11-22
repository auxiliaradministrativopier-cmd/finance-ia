import { LoginForm } from "@/features/auth/components/login-form";
import { screenMetadata } from "@/config/screens";

export const metadata = screenMetadata("entrar");

export default function Page() {
  return <LoginForm />;
}
