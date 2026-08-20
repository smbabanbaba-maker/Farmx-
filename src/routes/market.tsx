import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ListingRail } from "@/components/MarketListingCard";
import { getMarketRepository, type MarketRepository } from "@/lib/market-repository";
import { getCategoryImage } from "@/lib/market-category-images";
import type { MarketCategory } from "@/lib/market-types";
import { NIGERIA_STATES_LGAS } from "@/lib/nigeria-locations";
import { useI18n } from "@/lib/i18n";
import { breadcrumbJsonLd, createSeoHead, publicIndexingEnabled } from "@/lib/seo";
import { ChevronRight, CircleHelp, MapPin, Search, ShieldCheck, X } from "lucide-react";

export const Route = createFileRoute("/market")({
  head: () =>
    createSeoHead({
      title: "Goall26 marketplace in Nigeria | Buy and sell online",
      description:
        "Discover real products, services, vehicles, property, electronics, and more from sellers across Nigeria on Goall26.",
      path: "/market",
      keywords: [
        "Nigeria online marketplace",
        "buy and sell Nigeria",
        "classified marketplace",
        "Goall26 marketplace",
      ],
      noindex: !publicIndexingEnabled(),
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Goall26 marketplace",
          description: "Public products, services, and marketplace listings on Goall26.",
        },
        breadcrumbJsonLd([{ name: "Goall26 Market", path: "/market" }]),
      ],
    }),
  component: Market,
});

function Market() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [repository, setRepository] = useState<MarketRepository | null>(null);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [location, setLocation] = useState("Kano");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<MarketCategory[]>([]);
  const [sections, setSections] = useState<{
    nearby: Awaited<ReturnType<MarketRepository["getNearbyListings"]>>;
    latest: Awaited<ReturnType<MarketRepository["getListings"]>>["listings"];
  }>({ nearby: [], latest: [] });

  const loadMarket = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextRepository = await getMarketRepository();
      const [categoriesResult, nearby, latest] = await Promise.all([
        nextRepository.getCategories(),
        nextRepository.getNearbyListings(location),
        nextRepository.getListings({ sort: "newest", pageSize: 12 }),
      ]);
      setRepository(nextRepository);
      setCategories(categoriesResult);
      setSections({ nearby, latest: latest.listings });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Market listings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    void loadMarket();
  }, [loadMarket]);

  const searchSuggestions = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return ["Vehicles", "Phones", "Property", "Fashion", "Services"];
    return [...sections.latest, ...sections.nearby]
      .filter(
        (listing) =>
          listing.title.toLowerCase().includes(search) ||
          listing.category.toLowerCase().includes(search) ||
          listing.seller.name.toLowerCase().includes(search),
      )
      .slice(0, 5)
      .map((listing) => listing.title);
  }, [query, sections.latest, sections.nearby]);

  const submitSearch = async (value = query) => {
    const search = value.trim();
    if (!search) return;
    await repository?.recordSearch(search);
    navigate({ to: "/market/search", search: { q: search } });
  };

  return (
    <AppShell title={t("home")}>
      <div className="space-y-6 pb-6">
        <section className="space-y-3" aria-label="Market search and location">
          <form
            className="relative"
            onSubmit={(event) => {
              event.preventDefault();
              void submitSearch();
            }}
          >
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
              placeholder="Search products, services or sellers"
              aria-label="Search Goall26 Market"
              className="h-12 w-full rounded-2xl border border-border bg-card pl-10 pr-20 text-sm outline-none shadow-sm transition focus:border-navy focus:ring-2 focus:ring-navy/15"
            />
            {query && (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setQuery("")}
                className="absolute right-14 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl bg-brand px-3.5 py-2 text-xs font-black text-brand-foreground"
            >
              Search
            </button>
            {searchFocused && (
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-2xl border border-border bg-card p-2 shadow-xl">
                <p className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {query ? "Suggestions" : "Popular searches"}
                </p>
                {searchSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setQuery(suggestion);
                      void submitSearch(suggestion);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-semibold hover:bg-muted"
                  >
                    <Search className="h-3.5 w-3.5 text-navy" />
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </form>
          <div className="flex items-center justify-between gap-3">
            <label className="flex min-w-0 items-center gap-2 text-xs font-bold text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0 text-navy" />
              <select
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="min-w-0 truncate rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-bold outline-none"
              >
                <option value="">All locations</option>
                {Object.keys(NIGERIA_STATES_LGAS)
                  .sort()
                  .map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
              </select>
            </label>
            <Link
              to="/market/search"
              search={{ q: "" }}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-navy"
            >
              Filters <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        <section className="space-y-2" aria-label="Market categories">
          <div className="flex items-end justify-between px-1">
            <div>
              <h2 className="text-base font-black">Categories</h2>
              <p className="text-[10px] text-muted-foreground">
                Find products and services for everyday life.
              </p>
            </div>
            <Link to="/market/categories" className="text-[11px] font-bold text-navy">
              See all
            </Link>
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {categories.slice(0, 8).map((category) => (
              <Link
                key={category.id}
                to="/market/category/$category"
                params={{ category: category.id }}
                className="group flex min-w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-border bg-card px-2 py-2.5 text-center transition hover:border-navy/40 hover:bg-navy/5"
              >
                <span className="flex h-10 w-12 items-center justify-center overflow-hidden rounded-xl bg-navy/10">
                  <img
                    src={getCategoryImage(category.id)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </span>
                <span className="w-full truncate text-[9px] font-bold group-hover:text-navy">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {loading ? (
          <MarketLoading />
        ) : error ? (
          <MarketError message={error} retry={() => void loadMarket()} />
        ) : (
          <>
            <ListingRail
              title={`Nearby in ${location || "Nigeria"}`}
              listings={sections.nearby}
              href="/market/search"
            />
            <ListingRail title="Latest listings" listings={sections.latest} href="/market/search" />
            {sections.nearby.length === 0 && sections.latest.length === 0 && <MarketEmpty />}
            <Link
              to="/profile-center/$section"
              params={{ section: "safety" }}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-[11px] font-black text-navy transition hover:border-navy/30 hover:bg-navy/5"
            >
              <ShieldCheck className="h-4 w-4 text-success" />
              Shop safely on Goall26
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </>
        )}
      </div>
    </AppShell>
  );
}

function MarketLoading() {
  return (
    <div className="space-y-6" aria-label="Loading market listings">
      {Array.from({ length: 2 }, (_, railIndex) => (
        <section key={railIndex} className="space-y-2">
          <div className="h-5 w-36 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-72 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
function MarketEmpty() {
  return (
    <section className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center">
      <h2 className="text-sm font-black">No listings here yet</h2>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
        Try another location or be the first seller to post a product or service.
      </p>
      <Link
        to="/post"
        className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2.5 text-xs font-black text-brand-foreground"
      >
        Post a listing
      </Link>
    </section>
  );
}

function MarketError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <section className="rounded-2xl border border-dashed border-brand/40 bg-card px-5 py-10 text-center">
      <CircleHelp className="mx-auto h-8 w-8 text-brand" />
      <h2 className="mt-3 text-sm font-black">Market could not load</h2>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
      <button
        onClick={retry}
        className="mt-4 rounded-xl bg-brand px-4 py-2 text-xs font-black text-brand-foreground"
      >
        Retry
      </button>
    </section>
  );
}
