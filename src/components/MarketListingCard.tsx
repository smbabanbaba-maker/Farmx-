import { Link } from "@tanstack/react-router";
import { BadgeCheck, Bookmark, Eye, MapPin, MessageCircle, Share2, Star } from "lucide-react";
import { usePrefs } from "@/lib/prefs";
import type { MarketListing } from "@/lib/market-dev-data";
import { getMarketRepository } from "@/lib/market-repository";

export function MarketListingCard({
  listing,
  compact = false,
}: {
  listing: MarketListing;
  compact?: boolean;
}) {
  const { isSaved, toggleSaved } = usePrefs();
  const saved = isSaved(listing.id);
  const verified =
    listing.seller.verification === "verified_seller" ||
    listing.seller.verification === "verified_business";
  const shareListing = async () => {
    const url = `${window.location.origin}/product/${listing.id}`;
    if (navigator.share)
      await navigator.share({ title: listing.title, url }).catch(() => undefined);
    else {
      await navigator.clipboard?.writeText(url);
    }
  };
  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md ${compact ? "min-w-[196px] max-w-[196px]" : ""}`}
    >
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        <button
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const nextSaved = !saved;
            toggleSaved(listing.id);
            void getMarketRepository().then((repository) =>
              nextSaved ? repository.saveListing(listing.id) : repository.unsaveListing(listing.id),
            );
          }}
          className="rounded-full bg-background/90 p-1.5 shadow-sm"
          aria-label={saved ? `Remove ${listing.title} from saved` : `Save ${listing.title}`}
        >
          <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-brand text-brand" : ""}`} />
        </button>
        <button
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void shareListing();
          }}
          className="rounded-full bg-background/90 p-1.5 shadow-sm"
          aria-label={`Share ${listing.title}`}
        >
          <Share2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <Link
        to="/product/$id"
        params={{ id: listing.id }}
        className="block"
        aria-label={`Open ${listing.title}`}
      >
        <div className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-brand/10 via-accent to-brand/5 text-5xl">
          <span aria-hidden="true">{listing.imagePlaceholder}</span>
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {listing.featured && (
              <span className="rounded-full bg-brand px-2 py-1 text-[9px] font-black text-brand-foreground">
                FEATURED
              </span>
            )}
            {listing.sponsored && (
              <span className="rounded-full bg-foreground/85 px-2 py-1 text-[9px] font-black text-background">
                SPONSORED
              </span>
            )}
          </div>
          <span className="absolute bottom-2 right-2 rounded-full bg-background/85 px-2 py-1 text-[9px] font-bold text-muted-foreground">
            {listing.images.length} photo{listing.images.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="p-3">
          <h3 className="truncate text-sm font-black leading-5">{listing.title}</h3>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {listing.city}, {listing.state}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="truncate text-base font-black text-brand">
              {listing.priceLabel ??
                (listing.price === null ? "Request quote" : `₦${listing.price.toLocaleString()}`)}
            </span>
            <span className="shrink-0 text-[9px] text-muted-foreground">{listing.unit}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1 truncate">
              <span className="truncate">{listing.seller.name}</span>
              {verified && (
                <BadgeCheck className="h-3 w-3 shrink-0 text-brand" aria-label="Verified seller" />
              )}
            </span>
            <span className="flex shrink-0 items-center gap-0.5 font-bold text-foreground">
              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
              {listing.seller.rating}
            </span>
          </div>
          {!compact && (
            <div className="mt-2 flex items-center gap-3 text-[9px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {listing.stats.views.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {listing.stats.inquiries}
              </span>
              <span className="rounded-full bg-brand/5 text-brand px-1.5 py-0.5 font-bold">
                {listing.category}
              </span>
              <span className="rounded-full bg-muted px-1.5 py-0.5 capitalize">
                {listing.condition}
              </span>
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}

export function ListingRail({
  title,
  subtitle,
  listings,
  href,
}: {
  title: string;
  subtitle?: string;
  listings: MarketListing[];
  href?: string;
}) {
  if (listings.length === 0) return null;
  return (
    <section className="space-y-2">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <h2 className="text-base font-black">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</p>}
        </div>
        {href && (
          <Link to={href as "/market"} className="text-[11px] font-bold text-brand">
            See all
          </Link>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {listings.map((listing) => (
          <MarketListingCard key={listing.id} listing={listing} compact />
        ))}
      </div>
    </section>
  );
}
