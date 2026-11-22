import { screenMetadata } from "@/config/screens";
import { DashboardPage } from "@/features/dashboard/components/dashboard-page";

export const metadata = screenMetadata("inicio");

export default function Page() {
  return <DashboardPage />;
}
