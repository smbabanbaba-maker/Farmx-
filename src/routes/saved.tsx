import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { getMarketRepository } from "@/lib/market-repository";
import type { MarketListing } from "@/lib/market-dev-data";
import { getCommunityRepository } from "@/lib/community-repository";
import type { CommunityPost } from "@/lib/community.types";
import { Heart, MapPin, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved Ads — FarmX" },
      {
        name: "description",
        content: "Your favourite FarmX ads saved for later, with prices and seller locations.",
      },
      { property: "og:title", content: "FarmX Saved Ads" },
      { property: "og:description", content: "Favourite ads saved for later." },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const { t } = useI18n();
  const { toggleSaved } = usePrefs();
  const [list, setList] = useState<MarketListing[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [communityLoading, setCommunityLoading] = useState(true);
  useEffect(() => {
    void getMarketRepository()
      .then((repository) => repository.getSavedListings())
      .then(setList)
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    void getCommunityRepository()
      .then((repository) => repository.getSavedPosts())
      .then(setCommunityPosts)
      .finally(() => setCommunityLoading(false));
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
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-56 animate-pulse rounded-2xl bg-muted" />
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
      <section className="mt-2 border-t border-border pt-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black">Saved Community posts</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Discussions and knowledge you saved for later.
            </p>
          </div>
          <MessageCircle className="h-5 w-5 text-brand" />
        </div>
        {communityLoading ? (
          <div className="space-y-3">
            {[1, 2].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : communityPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <p className="text-xs font-bold">No saved Community posts yet.</p>
            <Link
              to="/community"
              className="mt-3 inline-flex rounded-xl bg-brand px-3 py-2 text-[11px] font-black text-brand-foreground"
            >
              Discover Community
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {communityPosts.map((post) => (
              <Link
                key={post.id}
                to="/community/$id"
                params={{ id: post.id }}
                className="block rounded-2xl border border-border bg-card p-3 hover:border-brand"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black">
                      {post.author.name} · {post.topic.replaceAll("-", " ")}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {post.content}
                    </p>
                  </div>
                  <Heart className="h-4 w-4 shrink-0 fill-brand text-brand" />
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  {post.commentCount} comments · {post.likeCount} likes
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
