import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getMarketRepository } from "@/lib/market-repository";
import type { MarketCategory } from "@/lib/market-dev-data";
import { ChevronLeft, ChevronRight, Search, Tags } from "lucide-react";
import { breadcrumbJsonLd, createSeoHead, publicIndexingEnabled } from "@/lib/seo";

export const Route = createFileRoute("/market/categories")({
  head: () =>
    createSeoHead({
      title: "Marketplace categories | FarmX",
      description:
        "Explore public FarmX marketplace categories for agriculture, vehicles, property, services and more.",
      path: "/market/categories",
      keywords: ["FarmX categories", "agriculture categories", "Nigeria marketplace categories"],
      noindex: !publicIndexingEnabled(),
      jsonLd: breadcrumbJsonLd([
        { name: "FarmX Market", path: "/market" },
        { name: "Categories", path: "/market/categories" },
      ]),
    }),
  component: MarketCategories,
});

function MarketCategories() {
  const [categories, setCategories] = useState<MarketCategory[]>([]);
  const [query, setQuery] = useState("");
  useEffect(() => {
    void getMarketRepository()
      .then((repository) => repository.getCategories())
      .then(setCategories);
  }, []);
  const filtered = categories.filter(
    (category) =>
      !query ||
      `${category.name} ${category.description} ${category.subcategories.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <AppShell title="Market categories">
      <div className="space-y-4 pb-6">
        <div className="flex items-center gap-2">
          <Link
            to="/market"
            className="rounded-xl border border-border bg-card p-2"
            aria-label="Back to Market"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand">
              FarmX Market
            </p>
            <h1 className="text-xl font-black">Agricultural categories</h1>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search categories or subcategories…"
            className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-3 text-sm outline-none focus:border-brand"
          />
        </div>
        <div className="space-y-3">
          {filtered.map((category) => (
            <Link
              key={category.id}
              to="/market/category/$category"
              params={{ category: category.id }}
              className="block rounded-2xl border border-border bg-card p-4 transition hover:border-brand/50 hover:bg-brand/5"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-2xl">
                  {category.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-black">{category.name}</h2>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                    {category.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {category.subcategories.slice(0, 5).map((subcategory) => (
                      <span
                        key={subcategory}
                        className="rounded-full bg-muted px-2 py-1 text-[9px] font-semibold text-muted-foreground"
                      >
                        {subcategory}
                      </span>
                    ))}
                    {category.subcategories.length > 5 && (
                      <span className="rounded-full bg-brand/10 px-2 py-1 text-[9px] font-bold text-brand">
                        +{category.subcategories.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {filtered.length === 0 && (
          <section className="rounded-2xl border border-dashed border-border px-5 py-12 text-center">
            <Tags className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-black">No categories found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try a different category or subcategory.
            </p>
          </section>
        )}
      </div>
    </AppShell>
  );
}
