import { GuestOnly } from "@/features/auth/guards";

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return <GuestOnly>{children}</GuestOnly>;
}
