import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isProduction, publicEnv } from "@/lib/env";
import { ComponentGallery } from "./component-gallery";

export const metadata: Metadata = {
  title: "Componentes",
  robots: { index: false, follow: false },
};

/** Vitrine dos componentes básicos. Disponível em desenvolvimento ou com NEXT_PUBLIC_SHOW_DEV_PAGES=true. */
export default function ComponentsPage() {
  if (isProduction && !publicEnv.NEXT_PUBLIC_SHOW_DEV_PAGES) {
    notFound();
  }
  return <ComponentGallery />;
}
