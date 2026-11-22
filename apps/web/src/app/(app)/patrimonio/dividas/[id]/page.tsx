import { screenMetadata } from "@/config/screens";
import { DebtDetailPage } from "@/features/debts/components/debt-detail-page";

export const metadata = screenMetadata("divida");

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DebtDetailPage id={id} />;
}
