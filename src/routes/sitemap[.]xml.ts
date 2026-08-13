import { createFileRoute } from "@tanstack/react-router";
import { getMarketRepository, getMarketRuntimeMode } from "@/lib/market-repository";
import { getLearnRepository } from "@/lib/learn-repository";
import { getLearnRuntimeMode } from "@/lib/learn.functions";
import { getJobRepository } from "@/lib/job-repository";
import { publicIndexingEnabled, publicSiteUrl } from "@/lib/seo";

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}

type SitemapUrl = { loc: string; lastmod?: string };

function renderSitemap(urls: SitemapUrl[]) {
  const entries = urls
    .map(({ loc, lastmod }) =>
      [
        "  <url>",
        `    <loc>${escapeXml(loc)}</loc>`,
        lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>` : null,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

async function collectPublishedMarketUrls(urls: Map<string, SitemapUrl>) {
  if (!publicIndexingEnabled() || getMarketRuntimeMode() !== "production") return;
  const repository = await getMarketRepository();
  const listings = [] as Awaited<ReturnType<typeof repository.getListings>>["listings"];
  let page = 1;
  let hasMore = true;
  while (hasMore && page <= 100) {
    const result = await repository.getListings({ page, pageSize: 50, sort: "newest" });
    listings.push(...result.listings.filter((listing) => listing.status === "published"));
    hasMore = result.hasMore;
    page += 1;
  }

  const categories = await repository.getCategories();
  const categoryByName = new Map(categories.map((category) => [category.name, category]));
  const usedCategories = new Set<string>();
  const publicUsernames = new Set<string>();
  for (const listing of listings) {
    urls.set(`/product/${encodeURIComponent(listing.id)}`, {
      loc: `${publicSiteUrl()}/product/${encodeURIComponent(listing.id)}`,
      lastmod: listing.updatedAt,
    });
    usedCategories.add(listing.category);
    if (listing.seller.username) publicUsernames.add(listing.seller.username);
  }
  for (const categoryName of usedCategories) {
    const category = categoryByName.get(categoryName);
    if (!category) continue;
    urls.set(`/market/category/${encodeURIComponent(category.id)}`, {
      loc: `${publicSiteUrl()}/market/category/${encodeURIComponent(category.id)}`,
    });
  }
  if (publicIndexingEnabled("profiles")) {
    for (const username of publicUsernames) {
      urls.set(`/u/${encodeURIComponent(username)}`, {
        loc: `${publicSiteUrl()}/u/${encodeURIComponent(username)}`,
      });
    }
  }
  urls.set("/market", { loc: `${publicSiteUrl()}/market` });
  urls.set("/market/categories", { loc: `${publicSiteUrl()}/market/categories` });
}

async function collectPublishedLearnUrls(urls: Map<string, SitemapUrl>) {
  if (!publicIndexingEnabled("learn")) return;
  const runtime = await getLearnRuntimeMode().catch(() => ({ mode: "preview" as const }));
  if (runtime.mode !== "production") return;
  const repository = await getLearnRepository();
  const courses = await repository.getCourses();
  for (const course of courses.filter((item) => item.status === "published")) {
    urls.set(`/learn/${encodeURIComponent(course.id)}`, {
      loc: `${publicSiteUrl()}/learn/${encodeURIComponent(course.id)}`,
      lastmod: course.updatedAt,
    });
  }
  if (courses.length > 0) urls.set("/learn", { loc: `${publicSiteUrl()}/learn` });
}

async function collectPublishedJobUrls(urls: Map<string, SitemapUrl>) {
  if (!publicIndexingEnabled("jobs") || import.meta.env.VITE_JOBS_DATA_SOURCE !== "production")
    return;
  const repository = await getJobRepository();
  const jobs = await repository.getJobs();
  for (const job of jobs.filter((item) => item.status === "published")) {
    urls.set(`/jobs/${encodeURIComponent(job.id)}`, {
      loc: `${publicSiteUrl()}/jobs/${encodeURIComponent(job.id)}`,
      lastmod: job.updatedAt,
    });
  }
  if (jobs.length > 0) urls.set("/jobs", { loc: `${publicSiteUrl()}/jobs` });
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = new Map<string, SitemapUrl>();
        if (publicIndexingEnabled()) urls.set("/", { loc: `${publicSiteUrl()}/` });
        await Promise.all([
          collectPublishedMarketUrls(urls),
          collectPublishedLearnUrls(urls),
          collectPublishedJobUrls(urls),
        ]);
        const body = renderSitemap([...urls.values()]);
        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=300, s-maxage=900",
          },
        });
      },
    },
  },
});
