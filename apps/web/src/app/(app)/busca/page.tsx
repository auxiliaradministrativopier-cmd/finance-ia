import { ScreenPlaceholder } from "@/components/feedback/screen-placeholder";
import { screenMetadata } from "@/config/screens";

export const metadata = screenMetadata("busca");

export default function Page() {
  return <ScreenPlaceholder screen="busca" />;
}
