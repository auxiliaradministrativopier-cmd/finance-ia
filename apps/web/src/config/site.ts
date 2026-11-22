import { BRAND } from "@finance-ia/shared";
import { publicEnv } from "@/lib/env";

export const siteConfig = {
  name: BRAND.name,
  tagline: BRAND.tagline,
  description:
    "Organize suas finanças, planeje o futuro e acompanhe sua saúde financeira com a ajuda da inteligência artificial.",
  url: publicEnv.NEXT_PUBLIC_APP_URL,
  locale: BRAND.locale,
} as const;
