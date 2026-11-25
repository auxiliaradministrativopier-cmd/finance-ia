import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { PUBLIC_PAGES } from "./robots";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((path) => ({
    url: `${siteConfig.url}${path}`,
    changeFrequency: path === "/boas-vindas" ? "monthly" : "yearly",
    priority: path === "/boas-vindas" ? 1 : 0.3,
  }));
}
