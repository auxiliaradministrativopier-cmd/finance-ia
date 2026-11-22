import { ScreenPlaceholder } from "@/components/feedback/screen-placeholder";
import { screenMetadata } from "@/config/screens";

export const metadata = screenMetadata("meta");

export default function Page() {
  return <ScreenPlaceholder screen="meta" />;
}
