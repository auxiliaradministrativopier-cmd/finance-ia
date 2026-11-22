import { screenMetadata } from "@/config/screens";
import { CardsPage } from "@/features/cards/components/cards-page";

export const metadata = screenMetadata("cartoes");

export default function Page() {
  return <CardsPage />;
}
