import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { LOCATIONS, PRODUCT_CATEGORIES, PRICING, products, type Product } from "@/lib/mock-data";
import { Filter, MapPin, MessageSquare, Search, Sparkles, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
import { PayModal } from "@/components/PayModal";
import type { PaymentPurpose } from "@/lib/paystack";
import { useCompany } from "@/lib/company-store";
import { useMessages } from "@/lib/messages-store";

export const Route = createFileRoute("/market")({ component: Market });

type Sort = "newest" | "price-low" | "price-high" | "popular";

function Market() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { state } = useCompany();
  const { openConversationWith } = useMessages();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [location, setLocation] = useState("All states");
  const [condition, setCondition] = useState("Any condition");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [promoFor, setPromoFor] = useState<string | null>(null);
  const [pay, setPay] = useState<{ title: string; amount: number; purpose: PaymentPurpose } | null>(
    null,
  );

  const subscribed = state.tier !== "none";
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const min = Number(minPrice) || 0;
    const max = Number(maxPrice) || Number.POSITIVE_INFINITY;
    const next = products.filter((product) => {
      const matchesQuery =
        !needle ||
        [product.name, product.seller, product.location, product.category].some((value) =>
          value.toLowerCase().includes(needle),
        );
      return (
        matchesQuery &&
        (category === "All categories" || product.category === category) &&
        (location === "All states" || product.location === location) &&
        (condition === "Any condition" || product.condition === condition) &&
        product.price >= min &&
        product.price <= max
      );
    });
    return [...next].sort((a, b) => {
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      if (sort === "popular") return b.rating - a.rating;
      return b.listedAt - a.listedAt;
    });
  }, [query, category, location, condition, minPrice, maxPrice, sort]);

  const clearFilters = () => {
    setQuery("");
    setCategory("All categories");
    setLocation("All states");
    setCondition("Any condition");
    setMinPrice("");
    setMaxPrice("");
    setSort("newest");
  };

  return (
    <AppShell title={t("market")}>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products, sellers or locations"
            className="w-full pl-9 pr-12 py-3 rounded-xl bg-card border border-border text-sm"
          />
          <button
            onClick={() => setShowFilters((visible) => !visible)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg ${showFilters ? "bg-brand text-brand-foreground" : "hover:bg-accent"}`}
            aria-label="Toggle filters"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>

        {showFilters && (
          <section className="rounded-2xl bg-card border border-border p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={category}
                onChange={setCategory}
                label="Category"
                options={["All categories", ...PRODUCT_CATEGORIES]}
              />
              <Select
                value={location}
                onChange={setLocation}
                label="State"
                options={["All states", ...LOCATIONS]}
              />
              <Select
                value={condition}
                onChange={setCondition}
                label="Condition"
                options={["Any condition", "New", "Fairly Used", "Second-hand", "Made to Order"]}
              />
              <Select
                value={sort}
                onChange={(value) => setSort(value as Sort)}
                label="Sort"
                options={["newest", "price-low", "price-high", "popular"]}
                labels={{
                  newest: "Newest",
                  "price-low": "Price: low to high",
                  "price-high": "Price: high to low",
                  popular: "Popular",
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Min price
                <input
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  placeholder="₦0"
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
                />
              </label>
              <label className="text-[11px] font-semibold text-muted-foreground">
                Max price
                <input
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  placeholder="No limit"
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
                />
              </label>
            </div>
            <button
              onClick={clearFilters}
              className="w-full py-2 rounded-lg border border-border text-xs font-bold text-muted-foreground"
            >
              Clear filters
            </button>
          </section>
        )}

        {!subscribed && (
          <Link
            to="/subscribe"
            className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-brand/10 to-brand/5 border border-brand/30"
          >
            <div>
              <p className="text-sm font-bold">Get subscribed</p>
              <p className="text-[11px] text-muted-foreground">
                Unlock more listings, visibility and marketplace tools.
              </p>
            </div>
            <span className="text-xs font-semibold text-brand">Upgrade →</span>
          </Link>
        )}
        {subscribed && (
          <div className="flex items-center justify-between rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2.5">
            <p className="text-sm font-bold text-green-700 dark:text-green-400">Subscribed ✓</p>
            <Link to="/subscribe" className="text-xs font-bold text-brand">
              Manage plan
            </Link>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{filtered.length} listings found</p>
          {(query ||
            category !== "All categories" ||
            location !== "All states" ||
            condition !== "Any condition" ||
            minPrice ||
            maxPrice) && (
            <button onClick={clearFilters} className="text-xs font-bold text-brand">
              Reset
            </button>
          )}
        </div>
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="font-bold">No listings match your filters</p>
            <button onClick={clearFilters} className="mt-2 text-sm font-bold text-brand">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map((product) => (
              <MarketCard
                key={product.id}
                product={product}
                onMessage={() => {
                  const conversation = openConversationWith(
                    {
                      name: product.seller,
                      avatar: product.fallback,
                      verified: product.rating >= 4.4,
                      location: product.location,
                    },
                    {
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      image: product.image,
                      seller: product.seller,
                    },
                  );
                  navigate({ to: "/messages/$id", params: { id: conversation } });
                }}
                onBoost={() => setPromoFor(product.id)}
              />
            ))}
          </div>
        )}
      </div>

      {promoFor && (
        <PromoSheet
          onClose={() => setPromoFor(null)}
          onPick={(tier) => {
            const amount =
              tier === "basic"
                ? PRICING.promoWeek
                : tier === "top"
                  ? PRICING.promoTop
                  : PRICING.promoMonth;
            setPay({
              title: `${tier === "basic" ? "Basic Boost" : tier === "top" ? "TOP Promo" : "Premium Boost"}`,
              amount,
              purpose:
                tier === "basic"
                  ? { kind: "promo_week", productId: promoFor }
                  : { kind: "promo_month", productId: promoFor },
            });
            setPromoFor(null);
          }}
        />
      )}
      <PayModal
        open={!!pay}
        onClose={() => setPay(null)}
        title={pay?.title ?? ""}
        amountNaira={pay?.amount ?? 0}
        purpose={pay?.purpose ?? { kind: "promo_week", productId: "listing" }}
      />
    </AppShell>
  );
}

function Select({
  value,
  onChange,
  label,
  options,
  labels = {},
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: readonly string[];
  labels?: Record<string, string>;
}) {
  return (
    <label className="text-[11px] font-semibold text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full px-2.5 py-2 rounded-lg bg-background border border-border text-xs text-foreground"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

function MarketCard({
  product,
  onMessage,
  onBoost,
}: {
  product: Product;
  onMessage: () => void;
  onBoost: () => void;
}) {
  return (
    <article className="rounded-xl bg-card border border-border overflow-hidden relative">
      <Link to="/product/$id" params={{ id: product.id }} className="block">
        {product.promoted && (
          <span className="absolute top-1.5 left-1.5 z-10 text-[9px] px-1.5 py-0.5 rounded-full bg-brand text-brand-foreground font-bold">
            PROMO
          </span>
        )}
        <img
          src={product.image}
          alt={product.name}
          className="aspect-square w-full object-cover bg-muted"
          loading="lazy"
        />
        <div className="p-2.5">
          <p className="font-semibold text-xs truncate">{product.name}</p>
          <p className="mt-1 text-xs font-bold text-brand">₦{product.price.toLocaleString()}</p>
          <p className="mt-1 text-[10px] text-muted-foreground flex items-center gap-0.5 truncate">
            <MapPin className="h-2.5 w-2.5" />
            {product.location}
          </p>
          <div className="mt-1 flex items-center gap-0.5 text-[10px]">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            {product.rating}
          </div>
        </div>
      </Link>
      <div className="px-2.5 pb-2.5 flex gap-1.5">
        <button
          onClick={onMessage}
          className="flex-1 py-1.5 rounded-lg bg-brand text-brand-foreground text-[11px] font-semibold flex items-center justify-center gap-1"
        >
          <MessageSquare className="h-3 w-3" />
          Message
        </button>
        {!product.promoted && (
          <button
            onClick={onBoost}
            className="py-1.5 px-2 rounded-lg border border-brand text-brand"
            aria-label="Boost listing"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </article>
  );
}

function PromoSheet({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (tier: "basic" | "top" | "premium") => void;
}) {
  const options = [
    {
      id: "basic",
      name: "Basic Boost",
      note: "Top of search for 7 days",
      price: PRICING.promoWeek,
    },
    {
      id: "top",
      name: "TOP Promo",
      note: "Top spot + 15× traffic for 7 days",
      price: PRICING.promoTop,
    },
    {
      id: "premium",
      name: "Premium Boost",
      note: "Top spot + badge + 30× traffic",
      price: PRICING.promoMonth,
    },
  ] as const;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold">Promote listing</h3>
            <p className="text-xs text-muted-foreground">Choose a paid boost option.</p>
          </div>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-2">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => onPick(option.id)}
              className="w-full p-3 rounded-xl border border-border text-left hover:border-brand flex items-center justify-between gap-3"
            >
              <span>
                <span className="block text-sm font-semibold">{option.name}</span>
                <span className="block mt-0.5 text-xs text-muted-foreground">{option.note}</span>
              </span>
              <span className="font-bold text-brand">₦{option.price.toLocaleString()}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
