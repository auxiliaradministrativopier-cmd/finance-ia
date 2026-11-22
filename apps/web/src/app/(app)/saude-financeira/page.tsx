import { screenMetadata } from "@/config/screens";
import { HealthPage } from "@/features/health/components/health-page";

export const metadata = screenMetadata("saude-financeira");

export default function Page() {
  return <HealthPage />;
}
