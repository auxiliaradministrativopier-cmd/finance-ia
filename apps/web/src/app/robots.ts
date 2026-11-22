import type { MetadataRoute } from "next";

/** A área logada nunca deve ser indexada; só a página de boas-vindas é pública. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/boas-vindas"], disallow: ["/"] }],
  };
}
