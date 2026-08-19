import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MarketListingCard } from "@/components/MarketListingCard";
import { NIGERIA_STATES_LGAS } from "@/lib/nigeria-locations";
import {
  getMarketRepository,
  type MarketFilters,
  type MarketRepository,
  type MarketSort,
} from "@/lib/market-repository";
import { Search, SlidersHorizontal, X, RotateCcw, Clock3, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/market/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  component: MarketSearch,
});

function MarketSearch() {
  const navigate = useNavigate();
  const { q } = Route.useSearch();
  const [repository, setRepository] = useState<MarketRepository | null>(null);
  const [query, setQuery] = useState(q);
  const [sort, setSort] = useState<MarketSort>("relevant");
  const [filters, setFilters] = useState<MarketFilters>({});
  const [listings, setListings] = useState<
    Awaited<ReturnType<MarketRepository["getListings"]>>["listings"]
  >([]);
  const [total, setTotal] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextRepository = repository ?? (await getMarketRepository());
      const result = await nextRepository.getListings({ query: q, filters, sort, pageSize: 24 });
      const snapshot = await nextRepository.getSnapshot();
      setRepository(nextRepository);
      setListings(result.listings);
      setTotal(result.total);
      setRecentSearches(snapshot.recentSearches);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Search results could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [filters, q, repository, sort]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setQuery(q);
  }, [q]);

  const updateFilter = <K extends keyof MarketFilters>(
    key: K,
    value: MarketFilters[K] | undefined,
  ) => setFilters((current) => ({ ...current, [key]: value }));
  const reset = () => {
    setFilters({});
    setSort("relevant");
    setQuery("");
    void navigate({ to: "/market/search", search: { q: "" } });
  };
  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((value) => value !== undefined && value !== "").length,
    [filters],
  );

  return (
    <AppShell title="Market search">
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
              Goall26 Market
            </p>
            <h1 className="text-xl font-black">Search listings</h1>
          </div>
        </div>
        <form
          className="relative"
          onSubmit={(event) => {
            event.preventDefault();
            void navigate({ to: "/market/search", search: { q: query.trim() } });
            void repository?.recordSearch(query);
          }}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search crops, equipment, sellers…"
            className="w-full rounded-2xl border border-border bg-card py-3 pl-10 pr-20 text-sm outline-none focus:border-brand"
            aria-label="Search listings"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-14 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl bg-brand px-3 py-2 text-xs font-black text-brand-foreground">
            Search
          </button>
        </form>
        {recentSearches.length > 0 && !q && (
          <section className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1 text-xs font-black">
                <Clock3 className="h-3.5 w-3.5 text-brand" /> Recent searches
              </p>
              <button
                onClick={() => {
                  void repository?.clearSearchHistory();
                  setRecentSearches([]);
                }}
                className="text-[10px] font-bold text-brand"
              >
                Clear all
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {recentSearches.map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setQuery(item);
                    void navigate({ to: "/market/search", search: { q: item } });
                  }}
                  className="rounded-full border border-border px-3 py-1.5 text-[10px] font-semibold"
                >
                  {item}
                </button>
              ))}
            </div>
          </section>
        )}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            <span className="font-black text-foreground">{total}</span> listings found
            {q && (
              <>
                {" "}
                for <span className="font-bold text-brand">“{q}”</span>
              </>
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters((value) => !value)}
              className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold ${showFilters || activeFilterCount ? "border-brand bg-brand/10 text-brand" : "border-border bg-card"}`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-brand px-1.5 text-[9px] text-brand-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as MarketSort)}
              className="rounded-xl border border-border bg-card px-2 py-2 text-[10px] font-bold outline-none"
            >
              <option value="relevant">Most relevant</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="price_low">Price low</option>
              <option value="price_high">Price high</option>
              <option value="views">Most viewed</option>
              <option value="saves">Most saved</option>
              <option value="inquiries">Most contacted</option>
              <option value="nearest">Nearest</option>
            </select>
          </div>
        </div>
        {showFilters && (
          <section className="rounded-2xl border border-brand/20 bg-card p-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[10px] font-bold text-muted-foreground">
                Category
                <select
                  value={filters.category ?? ""}
                  onChange={(event) => updateFilter("category", event.target.value || undefined)}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2 text-xs font-semibold"
                >
                  <option value="">All categories</option>
                  <option>Crops & Grains</option>
                  <option>Livestock</option>
                  <option>Seeds & Seedlings</option>
                  <option>Fertilizers & Agrochemicals</option>
                  <option>Farm Machinery & Equipment</option>
                  <option>Irrigation</option>
                  <option>Solar & Farm Energy</option>
                  <option>Farm Services</option>
                  <option>Land & Farm Properties</option>
                  <option>Transport & Logistics</option>
                </select>
              </label>
              <label className="text-[10px] font-bold text-muted-foreground">
                State
                <select
                  value={filters.state ?? ""}
                  onChange={(event) => updateFilter("state", event.target.value || undefined)}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2 text-xs font-semibold"
                >
                  <option value="">All states</option>
                  {Object.keys(NIGERIA_STATES_LGAS)
                    .sort()
                    .map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-[10px] font-bold text-muted-foreground">
                Condition
                <select
                  value={filters.condition ?? ""}
                  onChange={(event) => updateFilter("condition", event.target.value || undefined)}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2 text-xs font-semibold"
                >
                  <option value="">Any condition</option>
                  <option value="new">New</option>
                  <option value="used">Used</option>
                  <option value="refurbished">Refurbished</option>
                  <option value="fresh">Fresh</option>
                </select>
              </label>
              <label className="text-[10px] font-bold text-muted-foreground">
                Seller
                <select
                  value={filters.sellerType ?? ""}
                  onChange={(event) =>
                    updateFilter(
                      "sellerType",
                      (event.target.value || undefined) as MarketFilters["sellerType"],
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2 text-xs font-semibold"
                >
                  <option value="">All sellers</option>
                  <option value="individual">Individual</option>
                  <option value="business">Business</option>
                </select>
              </label>
              <label className="text-[10px] font-bold text-muted-foreground">
                Price type
                <select
                  value={filters.priceType ?? ""}
                  onChange={(event) =>
                    updateFilter(
                      "priceType",
                      (event.target.value || undefined) as MarketFilters["priceType"],
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2 text-xs font-semibold"
                >
                  <option value="">Any price</option>
                  <option value="fixed">Fixed price</option>
                  <option value="negotiable">Negotiable</option>
                </select>
              </label>
              <label className="text-[10px] font-bold text-muted-foreground">
                Listing type
                <select
                  value={
                    filters.featured === true
                      ? "featured"
                      : filters.sponsored === true
                        ? "sponsored"
                        : ""
                  }
                  onChange={(event) => {
                    updateFilter("featured", event.target.value === "featured" ? true : undefined);
                    updateFilter(
                      "sponsored",
                      event.target.value === "sponsored" ? true : undefined,
                    );
                  }}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2 text-xs font-semibold"
                >
                  <option value="">All listings</option>
                  <option value="featured">Featured</option>
                  <option value="sponsored">Sponsored</option>
                </select>
              </label>
              <label className="text-[10px] font-bold text-muted-foreground">
                Minimum price
                <input
                  type="number"
                  min="0"
                  value={filters.priceMin ?? ""}
                  onChange={(event) =>
                    updateFilter(
                      "priceMin",
                      event.target.value ? Number(event.target.value) : undefined,
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2 text-xs font-semibold"
                  placeholder="₦0"
                />
              </label>
              <label className="text-[10px] font-bold text-muted-foreground">
                Maximum price
                <input
                  type="number"
                  min="0"
                  value={filters.priceMax ?? ""}
                  onChange={(event) =>
                    updateFilter(
                      "priceMax",
                      event.target.value ? Number(event.target.value) : undefined,
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2 text-xs font-semibold"
                  placeholder="No limit"
                />
              </label>
            </div>
            <button
              onClick={reset}
              className="mt-3 inline-flex items-center gap-1 text-xs font-black text-brand"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset filters
            </button>
          </section>
        )}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : error ? (
          <section className="rounded-2xl border border-dashed border-brand/40 p-10 text-center">
            <p className="text-sm font-black">Search is unavailable</p>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
            <button
              onClick={() => void load()}
              className="mt-4 rounded-xl bg-brand px-4 py-2 text-xs font-black text-brand-foreground"
            >
              Retry
            </button>
          </section>
        ) : listings.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-border px-5 py-12 text-center">
            <Search className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-black">No listings found</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Try another keyword, browse categories, or remove filters.
            </p>
            <button
              onClick={reset}
              className="mt-4 rounded-xl bg-brand px-4 py-2 text-xs font-black text-brand-foreground"
            >
              Clear filters
            </button>
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
