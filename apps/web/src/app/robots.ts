import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/** Só as páginas públicas são indexadas; a área logada e as rotas /api, nunca. */
export const PUBLIC_PAGES = ["/boas-vindas", "/termos", "/privacidade"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: PUBLIC_PAGES, disallow: ["/"] }],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
