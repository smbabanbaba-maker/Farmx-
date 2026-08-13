import { createFileRoute } from "@tanstack/react-router";
import { publicIndexingEnabled, publicSiteUrl } from "@/lib/seo";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const indexingEnabled = publicIndexingEnabled();
        const body = indexingEnabled
          ? [
              "User-agent: *",
              "Allow: /",
              "Disallow: /admin",
              "Disallow: /settings",
              "Disallow: /wallet",
              "Disallow: /messages",
              "Disallow: /chats",
              "Disallow: /notifications",
              "Disallow: /profile",
              "Disallow: /profile-center",
              "Disallow: /profile/private",
              "Disallow: /edit-profile",
              "Disallow: /post-product",
              "Disallow: /edit-ad",
              "Disallow: /plans",
              "Disallow: /subscribe",
              "Disallow: /upgrade",
              "Disallow: /verify",
              "Disallow: /orders",
              "Disallow: /saved",
              "Disallow: /reports",
              "Disallow: /analytics",
              "Disallow: /inventory",
              "Disallow: /staff",
              "Disallow: /disputes",
              "Disallow: /api/private",
              "Disallow: /api/payments",
              `Sitemap: ${publicSiteUrl()}/sitemap.xml`,
              "",
            ].join("\n")
          : ["User-agent: *", "Disallow: /", `Sitemap: ${publicSiteUrl()}/sitemap.xml`, ""].join(
              "\n",
            );
        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
