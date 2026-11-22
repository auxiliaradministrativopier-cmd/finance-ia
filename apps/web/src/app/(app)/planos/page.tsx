import { ScreenPlaceholder } from "@/components/feedback/screen-placeholder";
import { screenMetadata } from "@/config/screens";

export const metadata = screenMetadata("planos");

export default function Page() {
  return <ScreenPlaceholder screen="planos" />;
}
