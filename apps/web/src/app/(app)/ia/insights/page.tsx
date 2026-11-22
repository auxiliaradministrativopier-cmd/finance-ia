import { ScreenPlaceholder } from "@/components/feedback/screen-placeholder";
import { screenMetadata } from "@/config/screens";

export const metadata = screenMetadata("ia-insights");

export default function Page() {
  return <ScreenPlaceholder screen="ia-insights" />;
}
