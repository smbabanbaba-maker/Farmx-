import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { products } from "@/lib/mock-data";
import {
  BadgeCheck,
  MapPin,
  MessageSquare,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useCompany, TIER_META } from "@/lib/company-store";
import { useMessages } from "@/lib/messages-store";
import { usePrefs } from "@/lib/prefs";

export const Route = createFileRoute("/market")({ component: Market });

const FILTERS = ["All", "Grains", "Fresh produce", "Tubers", "Livestock", "Farm inputs"] as const;
type Filter = (typeof FILTERS)[number];

function categoryFor(name: string): Exclude<Filter, "All"> {
  const product = name.toLowerCase();
  if (/(maize|rice|groundnut|millet|sorghum|bean|soy)/.test(product)) return "Grains";
  if (/(tomato|okra|pepper|plantain|vegetable|fruit|oil)/.test(product)) return "Fresh produce";
  if (/(yam|cassava|potato)/.test(product)) return "Tubers";
  if (/(goat|cow|chicken|poultry|fish|egg)/.test(product)) return "Livestock";
  return "Farm inputs";
}

function Market() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { state, isBadgeActive } = useCompany();
  const { openConversationWith } = useMessages();
  const { hiddenAds, hiddenSellers, toggles } = usePrefs();
  const [query, setQuery] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("All");

  const myCompanyName = state.company?.name.toLowerCase() ?? "";
  const badgeActive = isBadgeActive();
  const tierMeta = state.tier !== "none" ? TIER_META[state.tier] : null;

  const listings = useMemo(() => {
    const search = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search) ||
        product.seller.toLowerCase().includes(search) ||
        product.location.toLowerCase().includes(search);
      const matchesFilter = filter === "All" || categoryFor(product.name) === filter;
      const hidden = hiddenAds.includes(product.id) || hiddenSellers.includes(product.seller);
      return matchesSearch && matchesFilter && !hidden;
    });
  }, [filter, hiddenAds, hiddenSellers, query]);

  const startChat = (product: (typeof products)[number]) => {
    if (toggles.disableChats) {
      setNote("Chats are disabled in Settings. Enable chats to message this seller.");
      return;
    }
    const conversationId = openConversationWith(
      {
        name: product.seller,
        avatar: product.image,
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
    navigate({ to: "/messages/$id", params: { id: conversationId } });
  };

  return (
    <AppShell title={t("market")}>
      <div className="space-y-4 pb-5">
        <section className="rounded-2xl border border-brand/20 bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1 text-xs font-bold text-brand">
                <Sparkles className="h-3.5 w-3.5" /> FarmX marketplace
              </p>
              <h2 className="mt-1 text-lg font-black">Quality agricultural products</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Open any listing to see full product details, seller feedback, delivery options,
                secure payment and live chat.
              </p>
            </div>
            <span className="rounded-xl border border-brand/20 bg-card px-2 py-1 text-[10px] font-bold text-brand">
              {products.length} listings
            </span>
          </div>
        </section>

        {state.tier === "none" && (
          <Link
            to="/subscribe"
            className="flex items-center justify-between rounded-xl border border-brand/30 bg-card p-3 transition hover:border-brand"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand" />
              <div>
                <p className="text-sm font-bold">Get subscribed</p>
                <p className="text-[11px] text-muted-foreground">
                  Unlock more listings, visibility and marketplace tools
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-brand">Subscribe →</span>
          </Link>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products, sellers or locations…"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <span className="inline-flex shrink-0 items-center gap-1 py-1.5 text-xs font-bold text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filter:
          </span>
          {FILTERS.map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${filter === item ? "border-brand bg-brand text-brand-foreground" : "border-border bg-card text-muted-foreground hover:border-brand/40"}`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            <span className="font-bold text-foreground">{listings.length}</span> listings found
          </p>
          <p className="text-[10px] font-semibold text-brand">Tap any product for full details</p>
        </div>
        {note && (
          <p className="rounded-xl bg-brand/5 px-3 py-2 text-center text-xs font-semibold text-brand">
            {note}
          </p>
        )}

        {listings.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-border bg-card px-5 py-12 text-center">
            <Search className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-bold">No products found</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Try a different product, seller, state, or filter.
            </p>
            <button
              onClick={() => {
                setQuery("");
                setFilter("All");
              }}
              className="mt-4 rounded-lg bg-brand px-4 py-2 text-xs font-bold text-brand-foreground"
            >
              Clear filters
            </button>
          </section>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {listings.map((product) => {
              const isOwnCompany =
                badgeActive &&
                myCompanyName &&
                product.seller.toLowerCase().includes(myCompanyName.split(" ")[0]) &&
                tierMeta;
              return (
                <article
                  key={product.id}
                  className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md"
                >
                  {product.promoted && (
                    <span className="absolute left-2 top-2 z-10 rounded-full bg-brand px-2 py-0.5 text-[9px] font-bold text-brand-foreground">
                      PROMO
                    </span>
                  )}
                  <Link
                    to="/product/$id"
                    params={{ id: product.id }}
                    className="block"
                    aria-label={`View ${product.name} details`}
                  >
                    <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-brand/10 to-accent text-5xl">
                      {product.image}
                    </div>
                    <div className="p-3 pb-2">
                      <p className="truncate text-sm font-bold">{product.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                        <span className="truncate">{product.seller}</span>
                        {isOwnCompany && (
                          <BadgeCheck
                            className="h-3 w-3 shrink-0"
                            style={{ color: tierMeta.color }}
                          />
                        )}
                      </p>
                      <p className="mt-1 flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <MapPin className="h-2.5 w-2.5" /> {product.location}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-1">
                        <span className="text-sm font-black text-brand">
                          ₦{product.price.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-0.5 text-[11px] font-semibold">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          {product.rating}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <div className="px-3 pb-3">
                    <button
                      onClick={() => startChat(product)}
                      className="flex w-full items-center justify-center gap-1 rounded-lg bg-brand py-2 text-[11px] font-bold text-brand-foreground active:scale-[0.98]"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Message seller
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
