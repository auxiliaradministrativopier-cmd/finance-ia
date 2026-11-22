import { ScreenPlaceholder } from "@/components/feedback/screen-placeholder";
import { screenMetadata } from "@/config/screens";

export const metadata = screenMetadata("bens");

export default function Page() {
  return <ScreenPlaceholder screen="bens" />;
}
