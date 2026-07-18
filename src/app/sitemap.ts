import type { MetadataRoute } from "next";
import { listPublishedDtfProductSlugs } from "@/server/queries/dtf-products";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const productPaths = listPublishedDtfProductSlugs();
  const paths = [
    "",
    "/brindes",
    ...productPaths,
    "/como-funciona",
    "/sobre",
    "/contato",
    "/ajuda",
  ];

  return paths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency:
      path === "" || productPaths.includes(path) ? "weekly" : "monthly",
    priority: path === "" ? 1 : productPaths.includes(path) ? 0.9 : 0.6,
  }));
}
