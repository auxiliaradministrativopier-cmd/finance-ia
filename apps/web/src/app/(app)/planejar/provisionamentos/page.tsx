import { screenMetadata } from "@/config/screens";
import { ProvisionsPage } from "@/features/provisions/components/provisions-page";

export const metadata = screenMetadata("provisionamentos");

export default function Page() {
  return <ProvisionsPage />;
}
