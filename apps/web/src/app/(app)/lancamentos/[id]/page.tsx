import { ScreenPlaceholder } from "@/components/feedback/screen-placeholder";
import { screenMetadata } from "@/config/screens";

export const metadata = screenMetadata("lancamento");

export default function Page() {
  return <ScreenPlaceholder screen="lancamento" />;
}
