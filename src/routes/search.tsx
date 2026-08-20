import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  Check,
  ChevronDown,
  Filter,
  MapPin,
  RotateCcw,
  Search as SearchIcon,
  UsersRound,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Goall26SearchBar } from "@/components/Goall26SearchBar";
import { MarketListingCard } from "@/components/MarketListingCard";
import { NIGERIA_STATES_LGAS } from "@/lib/nigeria-locations";
import { getMarketRepository, type MarketFilters, type MarketSort } from "@/lib/market-repository";
import {
  getSearchResultCount,
  searchGlobal,
  type GlobalSearchResult,
  type GlobalSearchTab,
} from "@/lib/global-search";

const tabs: { id: GlobalSearchTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "listings", label: "Listings" },
  { id: "services", label: "Services" },
  { id: "businesses", label: "Businesses" },
];

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
    tab: tabs.some((item) => item.id === search.tab) ? (search.tab as GlobalSearchTab) : "all",
  }),
  component: GlobalSearch,
});

function GlobalSearch() {
  const navigate = useNavigate();
  const { q, tab } = Route.useSearch();
  const [result, setResult] = useState<GlobalSearchResult | null>(null);
  const [filters, setFilters] = useState<MarketFilters>({});
  const [sort, setSort] = useState<MarketSort>("relevant");
  const [categories, setCategories] = useState<{ name: string; subcategories: string[] }[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!q.trim()) {
      setResult(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [nextResult, categoryList] = await Promise.all([
        searchGlobal({ query: q, tab, filters, sort, pageSize: 24 }),
        getMarketRepository().then((repository) => repository.getCategories()),
      ]);
      setResult(nextResult);
      setCategories(categoryList);
    } catch {
      setError("Unable to load search results.");
    } finally {
      setLoading(false);
    }
  }, [filters, q, sort, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeTabs = useMemo(() => {
    if (!result) return tabs.filter((item) => item.id === "all");
    return tabs.filter((item) => result.availableTabs.includes(item.id) || item.id === tab);
  }, [result, tab]);

  const updateFilter = <K extends keyof MarketFilters>(
    key: K,
    value: MarketFilters[K] | undefined,
  ) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "category" ? { subcategory: undefined } : {}),
    }));
  };
  const clearFilters = () => setFilters({});
  const activeFilterCount = Object.values(filters).filter(
    (value) => value !== undefined && value !== "",
  ).length;
  const selectedCategory = categories.find((category) => category.name === filters.category);
  const standardListings = result?.listings.filter(
    (listing) => !result.services.some((service) => service.id === listing.id),
  );

  const goTab = (nextTab: GlobalSearchTab) => {
    void navigate({ to: "/search", search: { q, tab: nextTab } });
  };

  const filterChips = [
    filters.category ? { label: filters.category, key: "category" as const } : null,
    filters.subcategory ? { label: filters.subcategory, key: "subcategory" as const } : null,
    filters.state ? { label: filters.state, key: "state" as const } : null,
    filters.city ? { label: filters.city, key: "city" as const } : null,
    filters.condition ? { label: filters.condition, key: "condition" as const } : null,
    filters.sellerType ? { label: filters.sellerType, key: "sellerType" as const } : null,
    filters.verification ? { label: "Verified", key: "verification" as const } : null,
    filters.priceType ? { label: filters.priceType, key: "priceType" as const } : null,
    filters.featured ? { label: "Featured", key: "featured" as const } : null,
    filters.sponsored ? { label: "Sponsored", key: "sponsored" as const } : null,
    filters.priceMin !== undefined
      ? { label: `From ₦${filters.priceMin.toLocaleString()}`, key: "priceMin" as const }
      : null,
    filters.priceMax !== undefined
      ? { label: `Under ₦${filters.priceMax.toLocaleString()}`, key: "priceMax" as const }
      : null,
  ].filter(Boolean) as { label: string; key: keyof MarketFilters }[];

  return (
    <AppShell title="Search Goall26">
      <div className="space-y-5 pb-8">
        <header className="space-y-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand">
              Goall26 search
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">
              Find almost anything on Goall26.
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Search public listings, services, businesses, and sellers across Goall26.
            </p>
          </div>
          <Goall26SearchBar initialQuery={q} placeholder="Search products, services, businesses…" />
        </header>

        {!q.trim() ? (
          <section className="rounded-3xl border border-dashed border-brand/30 bg-card p-8 text-center">
            <SearchIcon className="mx-auto h-8 w-8 text-brand" />
            <h2 className="mt-3 text-base font-black">Start with a search</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Try “Toyota Corolla”, “greenhouse”, “solar installation”, or “tomato disease”.
            </p>
          </section>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Search results for <span className="font-black text-brand">“{q}”</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilters((current) => !current)}
                  className={`inline-flex min-h-10 items-center gap-1 rounded-xl border px-3 text-xs font-black ${showFilters || activeFilterCount ? "border-brand bg-brand/10 text-brand" : "border-border bg-card"}`}
                >
                  <Filter className="h-3.5 w-3.5" /> Filters
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-brand px-1.5 text-[9px] text-brand-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as MarketSort)}
                  className="min-h-10 max-w-40 rounded-xl border border-border bg-card px-3 text-[10px] font-black outline-none"
                  aria-label="Sort search results"
                >
                  <option value="relevant">Most relevant</option>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="price_low">Price: low to high</option>
                  <option value="price_high">Price: high to low</option>
                  <option value="views">Most viewed</option>
                  <option value="saves">Most saved</option>
                  <option value="nearest">Nearest</option>
                </select>
              </div>
            </div>

            {activeTabs.length > 1 && (
              <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Search result types">
                {activeTabs.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => goTab(item.id)}
                    className={`min-h-10 shrink-0 rounded-full border px-4 text-xs font-black transition ${tab === item.id ? "border-brand bg-brand text-brand-foreground" : "border-border bg-card text-muted-foreground"}`}
                  >
                    {item.label}{" "}
                    <span className="ml-1 opacity-70">
                      {result ? getSearchResultCount(result, item.id) : 0}
                    </span>
                  </button>
                ))}
              </nav>
            )}

            {filterChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {filterChips.map((chip) => (
                  <button
                    type="button"
                    key={chip.key}
                    onClick={() => updateFilter(chip.key, undefined)}
                    className="inline-flex min-h-8 items-center gap-1 rounded-full bg-brand/10 px-3 text-[10px] font-black text-brand"
                  >
                    {chip.label} <X className="h-3 w-3" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[10px] font-black text-muted-foreground underline"
                >
                  Clear all
                </button>
              </div>
            )}

            {showFilters && (
              <FilterPanel
                filters={filters}
                categories={categories}
                selectedCategory={selectedCategory}
                onChange={updateFilter}
                onClear={clearFilters}
                onClose={() => setShowFilters(false)}
              />
            )}

            {loading ? (
              <SearchSkeleton />
            ) : error ? (
              <section className="rounded-3xl border border-dashed border-brand/40 bg-card p-10 text-center">
                <p className="text-sm font-black">Unable to load search results.</p>
                <p className="mt-1 text-xs text-muted-foreground">Please try again in a moment.</p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="mt-4 min-h-10 rounded-xl bg-brand px-4 text-xs font-black text-brand-foreground"
                >
                  Retry
                </button>
              </section>
            ) : result && result.counts[tab] === 0 ? (
              <EmptySearch
                onClearFilters={clearFilters}
                onTryAnother={() => void navigate({ to: "/search", search: { q: "", tab: "all" } })}
              />
            ) : result ? (
              <SearchResults result={result} tab={tab} standardListings={standardListings ?? []} />
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}

function FilterPanel({
  filters,
  categories,
  selectedCategory,
  onChange,
  onClear,
  onClose,
}: {
  filters: MarketFilters;
  categories: { name: string; subcategories: string[] }[];
  selectedCategory?: { name: string; subcategories: string[] };
  onChange: <K extends keyof MarketFilters>(key: K, value: MarketFilters[K] | undefined) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-black/25 lg:hidden"
      />
      <aside className="fixed inset-x-0 bottom-0 z-40 max-h-[82vh] overflow-y-auto rounded-t-3xl border border-border bg-card p-5 shadow-2xl lg:static lg:z-auto lg:max-h-none lg:rounded-2xl lg:shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand">
              Refine results
            </p>
            <h2 className="mt-1 text-base font-black">Filters</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-muted"
            aria-label="Close filters"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <FilterSelect
            label="Category"
            value={filters.category ?? ""}
            onChange={(value) => onChange("category", value || undefined)}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.name}>{category.name}</option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Subcategory"
            value={filters.subcategory ?? ""}
            disabled={!selectedCategory}
            onChange={(value) => onChange("subcategory", value || undefined)}
          >
            <option value="">All subcategories</option>
            {(selectedCategory?.subcategories ?? []).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="State"
            value={filters.state ?? ""}
            onChange={(value) => onChange("state", value || undefined)}
          >
            <option value="">All states</option>
            {Object.keys(NIGERIA_STATES_LGAS)
              .sort()
              .map((location) => (
                <option key={location}>{location}</option>
              ))}
          </FilterSelect>
          <label className="text-[10px] font-bold text-muted-foreground">
            City or area
            <input
              value={filters.city ?? ""}
              onChange={(event) => onChange("city", event.target.value || undefined)}
              className="mt-1 min-h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-semibold"
              placeholder="e.g. Kano city"
            />
          </label>
          <FilterSelect
            label="Seller type"
            value={filters.sellerType ?? ""}
            onChange={(value) =>
              onChange("sellerType", (value || undefined) as MarketFilters["sellerType"])
            }
          >
            <option value="">All sellers</option>
            <option value="individual">Individual</option>
            <option value="business">Business</option>
          </FilterSelect>
          <FilterSelect
            label="Condition"
            value={filters.condition ?? ""}
            onChange={(value) => onChange("condition", value || undefined)}
          >
            <option value="">Any condition</option>
            <option value="new">New</option>
            <option value="used">Used</option>
            <option value="refurbished">Refurbished</option>
            <option value="fresh">Fresh</option>
          </FilterSelect>
          <FilterSelect
            label="Availability"
            value={filters.availability ?? ""}
            onChange={(value) =>
              onChange("availability", (value || undefined) as MarketFilters["availability"])
            }
          >
            <option value="">Available by default</option>
            <option value="available">Available</option>
            <option value="limited">Limited</option>
            <option value="unavailable">Unavailable</option>
          </FilterSelect>
          <FilterSelect
            label="Price"
            value={filters.priceType ?? ""}
            onChange={(value) =>
              onChange("priceType", (value || undefined) as MarketFilters["priceType"])
            }
          >
            <option value="">Any price</option>
            <option value="fixed">Fixed price</option>
            <option value="negotiable">Negotiable</option>
          </FilterSelect>
          <FilterSelect
            label="Verification"
            value={filters.verification ?? ""}
            onChange={(value) =>
              onChange("verification", (value || undefined) as MarketFilters["verification"])
            }
          >
            <option value="">Any seller</option>
            <option value="verified_seller">Verified seller</option>
            <option value="verified_business">Verified business</option>
          </FilterSelect>
          <label className="text-[10px] font-bold text-muted-foreground">
            Minimum price
            <input
              type="number"
              min="0"
              value={filters.priceMin ?? ""}
              onChange={(event) =>
                onChange("priceMin", event.target.value ? Number(event.target.value) : undefined)
              }
              className="mt-1 min-h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-semibold"
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
                onChange("priceMax", event.target.value ? Number(event.target.value) : undefined)
              }
              className="mt-1 min-h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-semibold"
              placeholder="No limit"
            />
          </label>
          <label className="flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-[10px] font-bold">
            <input
              type="checkbox"
              checked={filters.featured === true}
              onChange={(event) => onChange("featured", event.target.checked ? true : undefined)}
            />{" "}
            Featured
          </label>
          <label className="flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-[10px] font-bold">
            <input
              type="checkbox"
              checked={filters.sponsored === true}
              onChange={(event) => onChange("sponsored", event.target.checked ? true : undefined)}
            />{" "}
            Boosted
          </label>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-border px-4 text-xs font-black"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-xl bg-brand px-4 text-xs font-black text-brand-foreground lg:hidden"
          >
            Apply filters
          </button>
        </div>
      </aside>
    </>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="text-[10px] font-bold text-muted-foreground">
      {label}
      <span className="relative mt-1 block">
        <select
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-10 w-full appearance-none rounded-xl border border-border bg-background px-3 pr-7 text-xs font-semibold disabled:opacity-50"
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
      </span>
    </label>
  );
}

function SearchResults({
  result,
  tab,
  standardListings,
}: {
  result: GlobalSearchResult;
  tab: GlobalSearchTab;
  standardListings: NonNullable<GlobalSearchResult["listings"]>;
}) {
  const showListings = tab === "all" || tab === "listings";
  const showServices = tab === "all" || tab === "services";
  const showBusinesses = tab === "all" || tab === "businesses";
  return (
    <div className="space-y-8">
      {showListings && standardListings.length > 0 && (
        <ResultSection title="Listings" count={result.counts.listings}>
          <div className="space-y-3">
            {standardListings.map((listing) => (
              <MarketListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </ResultSection>
      )}
      {showServices && result.services.length > 0 && (
        <ResultSection title="Services" count={result.counts.services}>
          <div className="space-y-3">
            {result.services.map((listing) => (
              <MarketListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </ResultSection>
      )}
      {showBusinesses && result.businesses.length > 0 && (
        <ResultSection title="Businesses" count={result.counts.businesses}>
          <div className="space-y-3">
            {result.businesses.map((business) => (
              <Link
                key={business.username}
                to="/c/$slug"
                params={{ slug: business.username }}
                className="rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-brand/50"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-lg">
                    {business.photo}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{business.name}</p>
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {business.location}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <BadgeCheck className="h-3 w-3 text-brand" />
                    {business.verification === "verified_business"
                      ? "Verified business"
                      : "Business"}
                  </span>
                  <span>{business.activeListings} active ads</span>
                </div>
                <p className="mt-2 text-[10px] font-bold text-brand">View public profile</p>
              </Link>
            ))}
          </div>
        </ResultSection>
      )}
    </div>
  );
}

function ResultSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-brand">
            Search category
          </p>
          <h2 className="text-lg font-black">
            {title} <span className="text-xs text-muted-foreground">{count}</span>
          </h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptySearch({
  onClearFilters,
  onTryAnother,
}: {
  onClearFilters: () => void;
  onTryAnother: () => void;
}) {
  return (
    <section className="rounded-3xl border border-dashed border-brand/30 bg-card p-10 text-center">
      <UsersRound className="mx-auto h-8 w-8 text-brand" />
      <h2 className="mt-3 text-base font-black">No results found</h2>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
        Try checking spelling, using fewer keywords, changing location, or removing filters.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onClearFilters}
          className="min-h-10 rounded-xl border border-border px-4 text-xs font-black"
        >
          Clear filters
        </button>
        <button
          type="button"
          onClick={onTryAnother}
          className="min-h-10 rounded-xl bg-brand px-4 text-xs font-black text-brand-foreground"
        >
          Try another search
        </button>
      </div>
    </section>
  );
}

function SearchSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-64 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}
