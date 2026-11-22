import { ScreenPlaceholder } from "@/components/feedback/screen-placeholder";
import { screenMetadata } from "@/config/screens";

export const metadata = screenMetadata("conta");

export default function Page() {
  return <ScreenPlaceholder screen="conta" />;
}
