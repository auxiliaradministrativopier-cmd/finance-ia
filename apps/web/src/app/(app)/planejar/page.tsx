import { screenMetadata } from "@/config/screens";
import { PlanningPage } from "@/features/planning/components/planning-page";

export const metadata = screenMetadata("planejar");

export default function Page() {
  return <PlanningPage />;
}
