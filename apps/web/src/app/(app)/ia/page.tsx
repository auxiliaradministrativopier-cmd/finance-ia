import { screenMetadata } from "@/config/screens";
import { AssistantPage } from "@/features/assistant/components/assistant-page";

export const metadata = screenMetadata("ia");

export default function Page() {
  return <AssistantPage />;
}
