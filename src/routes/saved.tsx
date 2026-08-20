import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { getMarketRepository } from "@/lib/market-repository";
import type { MarketListing } from "@/lib/market-types";
import { Heart, MapPin } from "lucide-react";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved Ads — Goall26" },
      {
        name: "description",
        content: "Your favourite Goall26 ads saved for later, with prices and seller locations.",
      },
      { property: "og:title", content: "Goall26 Saved Ads" },
      { property: "og:description", content: "Favourite ads saved for later." },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const { t } = useI18n();
  const { toggleSaved } = usePrefs();
  const [list, setList] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void getMarketRepository()
      .then((repository) => repository.getSavedListings())
      .then(setList)
      .finally(() => setLoading(false));
  }, []);
  const remove = (id: string) => {
    toggleSaved(id);
    setList((current) => current.filter((listing) => listing.id !== id));
    void getMarketRepository().then((repository) => repository.unsaveListing(id));
  };
  return (
    <AppShell title={t("savedAds")}>
      <div className="pb-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-72 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center">
            <Heart className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-semibold">{t("savedAds")} — 0</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Save a listing from Market to revisit it here.
            </p>
            <Link
              to="/market"
              className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground"
            >
              {t("market")}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((listing) => (
              <div
                key={listing.id}
                className="relative overflow-hidden rounded-2xl border border-border bg-card"
              >
                <button
                  onClick={() => remove(listing.id)}
                  className="absolute right-2 top-2 z-10 rounded-full bg-background/90 p-1.5"
                  aria-label={`Remove ${listing.title} from saved`}
                >
                  <Heart className="h-4 w-4 fill-brand text-brand" />
                </button>
                <Link to="/product/$id" params={{ id: listing.id }}>
                  <div className="flex aspect-square items-center justify-center bg-brand/5 text-5xl">
                    {listing.imagePlaceholder}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-xs font-black">{listing.title}</p>
                    <p className="mt-1 text-xs font-black text-brand">
                      {listing.priceLabel ??
                        (listing.price === null
                          ? "Request quote"
                          : `₦${listing.price.toLocaleString()}`)}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {listing.city}, {listing.state}
                    </p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
