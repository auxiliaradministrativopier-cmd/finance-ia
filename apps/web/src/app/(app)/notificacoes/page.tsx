import { ScreenPlaceholder } from "@/components/feedback/screen-placeholder";
import { screenMetadata } from "@/config/screens";

export const metadata = screenMetadata("notificacoes");

export default function Page() {
  return <ScreenPlaceholder screen="notificacoes" />;
}
