import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://dignityagrofarms.com";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries = [
          { path: "/", priority: "1.0", changefreq: "weekly" },
          { path: "/about", priority: "0.8", changefreq: "monthly" },
          { path: "/products", priority: "0.9", changefreq: "weekly" },
          { path: "/order", priority: "0.9", changefreq: "weekly" },
          { path: "/track-order", priority: "0.8", changefreq: "monthly" },
          { path: "/contact", priority: "0.8", changefreq: "monthly" },
          { path: "/blog", priority: "0.7", changefreq: "weekly" },
          { path: "/privacy", priority: "0.5", changefreq: "yearly" },
          { path: "/terms", priority: "0.5", changefreq: "yearly" },
        ];
        const urls = entries
          .map(
            (e) =>
              `  <url><loc>${BASE_URL}${e.path}</loc><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`,
          )
          .join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});