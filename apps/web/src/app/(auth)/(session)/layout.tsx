import { RequireSession } from "@/features/auth/guards";

export default function SessionLayout({ children }: { children: React.ReactNode }) {
  return <RequireSession>{children}</RequireSession>;
}
