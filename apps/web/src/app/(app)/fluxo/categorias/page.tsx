import { screenMetadata } from "@/config/screens";
import { CategoriesPage } from "@/features/categories/components/categories-page";

export const metadata = screenMetadata("categorias");

export default function Page() {
  return <CategoriesPage />;
}
