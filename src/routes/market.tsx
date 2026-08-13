import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ListingRail, MarketListingCard } from "@/components/MarketListingCard";
import { getMarketRepository, type MarketRepository } from "@/lib/market-repository";
import type { MarketCategory } from "@/lib/market-dev-data";
import { useCompany } from "@/lib/company-store";
import { LOCATIONS } from "@/lib/mock-data";
import { useI18n } from "@/lib/i18n";
import {
  ChevronRight,
  CircleHelp,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Tractor,
  X,
} from "lucide-react";

export const Route = createFileRoute("/market")({ component: Market });

function Market() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { state } = useCompany();
  const [repository, setRepository] = useState<MarketRepository | null>(null);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [location, setLocation] = useState("Kano");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<MarketCategory[]>([]);
  const [sections, setSections] = useState<{
    featured: Awaited<ReturnType<MarketRepository["getFeaturedListings"]>>;
    sponsored: Awaited<ReturnType<MarketRepository["getSponsoredListings"]>>;
    nearby: Awaited<ReturnType<MarketRepository["getNearbyListings"]>>;
    latest: Awaited<ReturnType<MarketRepository["getListings"]>>["listings"];
    popular: Awaited<ReturnType<MarketRepository["getPopularListings"]>>;
    all: Awaited<ReturnType<MarketRepository["getListings"]>>["listings"];
  }>({ featured: [], sponsored: [], nearby: [], latest: [], popular: [], all: [] });

  const loadMarket = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextRepository = await getMarketRepository();
      const [categoriesResult, featured, sponsored, nearby, latest, popular, all] =
        await Promise.all([
          nextRepository.getCategories(),
          nextRepository.getFeaturedListings(),
          nextRepository.getSponsoredListings(),
          nextRepository.getNearbyListings(location),
          nextRepository.getListings({ sort: "newest", pageSize: 12 }),
          nextRepository.getPopularListings(),
          nextRepository.getListings({ sort: "relevant", pageSize: 8 }),
        ]);
      setRepository(nextRepository);
      setCategories(categoriesResult);
      setSections({
        featured,
        sponsored,
        nearby,
        latest: latest.listings,
        popular,
        all: all.listings,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Market listings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    void loadMarket();
  }, [loadMarket]);

  const serviceListings = useMemo(
    () =>
      sections.all.filter(
        (listing) =>
          listing.category === "Farm Services" || listing.category === "Transport & Logistics",
      ),
    [sections.all],
  );
  const businessListings = useMemo(() => {
    const seen = new Set<string>();
    return sections.all.filter(
      (listing) =>
        listing.seller.type === "business" &&
        !seen.has(listing.seller.name) &&
        seen.add(listing.seller.name),
    );
  }, [sections.all]);
  const searchSuggestions = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return ["Maize", "Tractors", "Irrigation", "Fertilizer", "Farm services"];
    return sections.all
      .filter(
        (listing) =>
          listing.title.toLowerCase().includes(search) ||
          listing.category.toLowerCase().includes(search) ||
          listing.seller.name.toLowerCase().includes(search),
      )
      .slice(0, 5)
      .map((listing) => listing.title);
  }, [query, sections.all]);

  const submitSearch = async (value = query) => {
    const search = value.trim();
    if (!search) return;
    await repository?.recordSearch(search);
    navigate({ to: "/market/search", search: { q: search } });
  };

  return (
    <AppShell title={t("market")}>
      <div className="space-y-6 pb-6">
        <section className="rounded-3xl border border-brand/20 bg-gradient-to-br from-brand/10 via-card to-accent p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.12em] text-brand">
                <Sparkles className="h-3.5 w-3.5" /> FarmX classified marketplace
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight">Find what you need.</h1>
              <p className="mt-2 max-w-md text-xs leading-5 text-muted-foreground">
                Discover vehicles, property, electronics, agriculture, services, and trusted
                businesses. Contact sellers directly—FarmX does not process private product
                payments.
              </p>
            </div>
            <div className="hidden rounded-2xl bg-brand p-3 text-brand-foreground sm:block">
              <Tractor className="h-8 w-8" />
            </div>
          </div>
          <form
            className="relative mt-5"
            onSubmit={(event) => {
              event.preventDefault();
              void submitSearch();
            }}
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
              placeholder="Search products, equipment, services, sellers…"
              aria-label="Search FarmX Market"
              className="w-full rounded-2xl border border-border bg-background py-3 pl-10 pr-20 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
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
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl bg-brand px-3 py-2 text-xs font-black text-brand-foreground"
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
                    <Search className="h-3.5 w-3.5 text-brand" />
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </form>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-brand" />
              <select
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-[10px] font-bold outline-none"
              >
                <option value="">All locations</option>
                {LOCATIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <Link
              to="/market/search"
              search={{ q: "" }}
              className="inline-flex items-center gap-1 text-[10px] font-black text-brand"
            >
              Advanced filters <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </section>

        {state.tier === "none" && (
          <Link
            to="/subscribe"
            className="flex items-center justify-between rounded-2xl border border-brand/30 bg-card p-3 transition hover:border-brand"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand" />
              <div>
                <p className="text-sm font-bold">Get subscribed</p>
                <p className="text-[11px] text-muted-foreground">
                  Unlock more listings, visibility and marketplace tools.
                </p>
              </div>
            </div>
            <span className="text-xs font-black text-brand">
              Subscribe <ChevronRight className="inline h-3.5 w-3.5" />
            </span>
          </Link>
        )}

        <section className="space-y-2">
          <div className="flex items-end justify-between px-1">
            <div>
              <h2 className="text-base font-black">Browse categories</h2>
              <p className="text-[10px] text-muted-foreground">
                Everything for you, your farm and business.
              </p>
            </div>
            <Link to="/market/categories" className="text-[11px] font-bold text-brand">
              See all
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {categories.slice(0, 8).map((category) => (
              <Link
                key={category.id}
                to="/market/category/$category"
                params={{ category: category.id }}
                className="group rounded-2xl border border-border bg-card p-2 text-center transition hover:border-brand/40 hover:bg-brand/5"
              >
                <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-xl">
                  {category.icon}
                </span>
                <span className="mt-1.5 block truncate text-[9px] font-bold group-hover:text-brand">
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
              title="Featured listings"
              subtitle="Paid FarmX visibility, clearly labelled."
              listings={sections.featured}
              href="/market/search"
            />
            <ListingRail
              title="Sponsored listings"
              subtitle="Seller-sponsored placements."
              listings={sections.sponsored}
              href="/market/search"
            />
            <ListingRail
              title={`Nearby in ${location || "Nigeria"}`}
              subtitle="Choose a state above; GPS permission is never required."
              listings={sections.nearby}
              href="/market/search"
            />
            <ListingRail
              title="Latest listings"
              subtitle="Recently published agricultural listings."
              listings={sections.latest}
              href="/market/search"
            />
            <ListingRail
              title="Popular listings"
              subtitle="Listings getting attention from FarmX buyers."
              listings={sections.popular}
              href="/market/search"
            />
            {serviceListings.length > 0 && (
              <ListingRail
                title="Farm services"
                subtitle="Connect directly with agricultural specialists."
                listings={serviceListings}
                href="/market/search"
              />
            )}
            {businessListings.length > 0 && (
              <ListingRail
                title="Agricultural businesses"
                subtitle="Explore businesses and their active listings."
                listings={businessListings}
                href="/market/search"
              />
            )}
            <section className="space-y-2">
              <div className="flex items-end justify-between px-1">
                <div>
                  <h2 className="text-base font-black">More listings</h2>
                  <p className="text-[10px] text-muted-foreground">
                    Browse all available marketplace ads.
                  </p>
                </div>
                <Link
                  to="/market/search"
                  search={{ q: "" }}
                  className="text-[11px] font-bold text-brand"
                >
                  See all
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {sections.all.map((listing) => (
                  <MarketListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            </section>
            <section className="rounded-2xl border border-brand/20 bg-brand/5 p-4">
              <div className="flex gap-3">
                <ShieldCheck className="h-5 w-5 shrink-0 text-brand" />
                <div>
                  <h2 className="text-sm font-black">FarmX safety reminder</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Always verify products and sellers before making payment. Meet safely, inspect
                    agricultural goods, avoid suspicious payments, and report suspicious listings.
                    FarmX does not hold or process private buyer-to-seller product payments.
                  </p>
                  <Link
                    to="/profile-center/$section"
                    params={{ section: "safety" }}
                    className="mt-2 inline-flex items-center gap-1 text-[10px] font-black text-brand"
                  >
                    Read safety guidance <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function MarketLoading() {
  return (
    <div className="space-y-4" aria-label="Loading market listings">
      <div className="h-5 w-40 animate-pulse rounded bg-muted" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-52 min-w-[196px] animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-64 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
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
