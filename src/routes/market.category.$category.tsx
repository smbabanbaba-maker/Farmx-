import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MarketListingCard } from "@/components/MarketListingCard";
import { getMarketCategory } from "@/lib/market-repository";
import {
  getMarketRepository,
  type MarketRepository,
  type MarketSort,
} from "@/lib/market-repository";
import {
  breadcrumbJsonLd,
  categoryCollectionJsonLd,
  createSeoHead,
  truncateDescription,
} from "@/lib/seo";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";

export const Route = createFileRoute("/market/category/$category")({
  loader: async ({ params }) => {
    const category = getMarketCategory(params.category);
    if (!category) return { category: null, listings: [] };
    const repository = await getMarketRepository();
    const result = await repository.getListings({
      page: 1,
      pageSize: 24,
      filters: { category: category.name },
    });
    return { category, listings: result.listings };
  },
  head: ({ params, loaderData }) => {
    const category = loaderData?.category;
    const listings = loaderData?.listings ?? [];
    if (!category || listings.length === 0) {
      return createSeoHead({
        title: "Market category unavailable | FarmX",
        description: "This FarmX marketplace category has no public listings available.",
        path: `/market/category/${encodeURIComponent(params.category)}`,
        noindex: true,
      });
    }
    return createSeoHead({
      title: `${category.name} agricultural marketplace | FarmX`,
      description: truncateDescription(
        `${category.description} Browse ${listings.length} public ${category.name} listings on FarmX.`,
      ),
      path: `/market/category/${encodeURIComponent(category.id)}`,
      keywords: [category.name, ...category.subcategories, "FarmX marketplace"],
      jsonLd: [
        categoryCollectionJsonLd(category, listings),
        breadcrumbJsonLd([
          { name: "FarmX Market", path: "/market" },
          { name: "Categories", path: "/market/categories" },
          { name: category.name, path: `/market/category/${encodeURIComponent(category.id)}` },
        ]),
      ],
    });
  },
  component: MarketCategoryPage,
});

function MarketCategoryPage() {
  const { category: categoryParam } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();
  const [repository, setRepository] = useState<MarketRepository | null>(null);
  const [query, setQuery] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [sort, setSort] = useState<MarketSort>("newest");
  const [listings, setListings] = useState<
    Awaited<ReturnType<MarketRepository["getListings"]>>["listings"]
  >(loaderData.listings);
  const [total, setTotal] = useState(loaderData.listings.length);
  const category = useMemo(() => getMarketCategory(categoryParam), [categoryParam]);

  const load = useCallback(async () => {
    if (!category) return;
    const nextRepository = repository ?? (await getMarketRepository());
    const result = await nextRepository.getListings({
      query,
      sort,
      pageSize: 24,
      filters: { category: category.name, subcategory: subcategory || undefined },
    });
    setRepository(nextRepository);
    setListings(result.listings);
    setTotal(result.total);
  }, [category, query, repository, sort, subcategory]);
  useEffect(() => {
    void load();
  }, [load]);

  if (!category)
    return (
      <AppShell title="Market category">
        <section className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm font-black">Category not found</p>
          <Link
            to="/market/categories"
            className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2 text-xs font-black text-brand-foreground"
          >
            Browse categories
          </Link>
        </section>
      </AppShell>
    );
  return (
    <AppShell title={category.name}>
      <div className="space-y-4 pb-6">
        <div className="flex items-center gap-2">
          <Link
            to="/market/categories"
            className="rounded-xl border border-border bg-card p-2"
            aria-label="Back to categories"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-2xl">{category.icon}</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand">
                FarmX category
              </p>
              <h1 className="truncate text-xl font-black">{category.name}</h1>
            </div>
          </div>
        </div>
        <section className="rounded-2xl border border-brand/20 bg-brand/5 p-4">
          <p className="text-xs leading-5 text-muted-foreground">{category.description}</p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSubcategory("")}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold ${!subcategory ? "border-brand bg-brand text-brand-foreground" : "border-border bg-card"}`}
            >
              All {category.name}
            </button>
            {category.subcategories.map((item) => (
              <button
                key={item}
                onClick={() => setSubcategory(item)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold ${subcategory === item ? "border-brand bg-brand text-brand-foreground" : "border-border bg-card"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </section>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search within ${category.name}…`}
            className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-3 text-sm outline-none focus:border-brand"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            <span className="font-black text-foreground">{total}</span> listings
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => void navigate({ to: "/market/search", search: { q: category.name } })}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 text-[10px] font-bold"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> All filters
            </button>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as MarketSort)}
              className="rounded-xl border border-border bg-card px-2 py-2 text-[10px] font-bold"
            >
              <option value="newest">Newest</option>
              <option value="price_low">Price low</option>
              <option value="price_high">Price high</option>
              <option value="views">Most viewed</option>
            </select>
          </div>
        </div>
        {listings.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-border px-5 py-12 text-center">
            <p className="text-sm font-black">No listings in this category</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try another subcategory or browse all Market listings.
            </p>
            <Link
              to="/market"
              className="mt-4 inline-flex items-center gap-1 rounded-xl bg-brand px-4 py-2 text-xs font-black text-brand-foreground"
            >
              Back to Market <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {listings.map((listing) => (
              <MarketListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
