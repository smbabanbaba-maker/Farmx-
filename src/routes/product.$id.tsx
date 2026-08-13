import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MarketListingCard } from "@/components/MarketListingCard";
import type { MarketListing } from "@/lib/market-dev-data";
import { getMarketRepository, type MarketRepository } from "@/lib/market-repository";
import { usePrefs } from "@/lib/prefs";
import { useMessages } from "@/lib/messages-store";
import { useNotifications } from "@/lib/notifications-store";
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Eye,
  Flag,
  MapPin,
  MessageSquare,
  MoreVertical,
  Phone,
  Send,
  Share2,
  ShieldCheck,
  Star,
  UserPlus,
  X,
} from "lucide-react";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "Listing details — FarmX Market" },
      {
        name: "description",
        content: "Discover agricultural listings and contact FarmX sellers directly.",
      },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { isSaved, toggleSaved, toggleFollow, isFollowing, hideAd, hideSeller, toggles } =
    usePrefs();
  const { openConversationWith } = useMessages();
  const { createNotification } = useNotifications();
  const [repository, setRepository] = useState<MarketRepository | null>(null);
  const [listing, setListing] = useState<MarketListing | null>(null);
  const [related, setRelated] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [menu, setMenu] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [chatText, setChatText] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Scam");
  const [reportDescription, setReportDescription] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextRepository = repository ?? (await getMarketRepository());
      const nextListing = await nextRepository.getListingById(id);
      if (!nextListing) throw new Error("This listing is no longer available.");
      await nextRepository.recordView(id);
      setRepository(nextRepository);
      setListing(nextListing);
      setRelated(await nextRepository.getRelatedListings(nextListing));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Listing could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [id, repository]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading)
    return (
      <AppShell title="Listing details">
        <div className="space-y-4 pb-8">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-72 animate-pulse rounded-3xl bg-muted" />
          <div className="h-48 animate-pulse rounded-2xl bg-muted" />
          <div className="h-44 animate-pulse rounded-2xl bg-muted" />
        </div>
      </AppShell>
    );
  if (error || !listing)
    return (
      <AppShell title="Listing details">
        <section className="rounded-2xl border border-dashed border-border px-5 py-12 text-center">
          <p className="text-sm font-black">Listing unavailable</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {error ?? "This listing could not be found."}
          </p>
          <Link
            to="/market"
            className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2 text-xs font-black text-brand-foreground"
          >
            Back to Market
          </Link>
        </section>
      </AppShell>
    );

  const verified =
    listing.seller.verification === "verified_seller" ||
    listing.seller.verification === "verified_business";
  const saved = isSaved(listing.id);
  const following = isFollowing(listing.seller.name);
  const callsEnabled = Boolean(toggles.inAppCalls);
  const priceText =
    listing.priceLabel ??
    (listing.price === null ? "Request quote" : `₦${listing.price.toLocaleString()}`);
  const currentImage = listing.images[photoIndex] ?? listing.imagePlaceholder;

  const openChat = (
    message = `Hello, I am interested in your ${listing.title}. Is it still available?`,
  ) => {
    if (toggles.disableChats) {
      setNote("Chats are disabled in Settings. Enable chats to contact this seller.");
      return;
    }
    const conversationId = openConversationWith(
      {
        id: listing.seller.username,
        username: listing.seller.username,
        name: listing.seller.name,
        avatar: listing.seller.photo,
        verified,
        location: listing.seller.location,
        callsEnabled: callsEnabled && listing.seller.phoneVerified,
      },
      {
        id: listing.id,
        name: listing.title,
        price: listing.price ?? 0,
        image: listing.images[0] ?? listing.imagePlaceholder,
        seller: listing.seller.name,
        location: `${listing.city}, ${listing.state}`,
        sellerUsername: listing.seller.username,
        closed: listing.status !== "published",
      },
    );
    navigate({
      to: "/messages/$id",
      params: { id: conversationId },
      search: { q: message } as never,
    });
  };

  const save = async () => {
    toggleSaved(listing.id);
    if (repository)
      await (saved ? repository.unsaveListing(listing.id) : repository.saveListing(listing.id));
    setNote(saved ? "Removed from Saved Ads." : "Saved to your Saved Ads.");
  };
  const follow = async () => {
    toggleFollow(listing.seller.name);
    if (repository)
      await (following
        ? repository.unfollowSeller(listing.seller.name)
        : repository.followSeller(listing.seller.name));
    setNote(
      following
        ? `You unfollowed ${listing.seller.name}.`
        : `You are now following ${listing.seller.name}.`,
    );
    setMenu(false);
  };
  const share = async () => {
    const url = typeof window === "undefined" ? "" : window.location.href;
    if (typeof navigator !== "undefined" && navigator.share)
      await navigator
        .share({ title: listing.title, text: `View ${listing.title} on FarmX Market`, url })
        .catch(() => undefined);
    else if (typeof navigator !== "undefined") {
      await navigator.clipboard?.writeText(url);
      setNote("Listing link copied. Share it with your network.");
    }
    setMenu(false);
  };
  const submitReport = async () => {
    if (repository)
      await repository.reportListing({
        listingId: listing.id,
        reason: reportReason,
        description: reportDescription || undefined,
      });
    setReportOpen(false);
    setReportDescription("");
    createNotification({
      type: "system",
      eventId: `listing-report:${listing.id}:${Date.now()}`,
      title: "Report submitted",
      body: "FarmX received your listing report and will review it.",
      priority: "important",
      targetUrl: "/reports",
    });
    setNote("Report received. FarmX will review this listing.");
  };

  return (
    <AppShell title="Listing details">
      <div className="space-y-4 pb-8">
        <div className="flex items-center justify-between">
          <Link
            to="/market"
            className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Market
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={() => void save()}
              className="rounded-full p-2 hover:bg-accent"
              aria-label={saved ? "Remove from saved" : "Save listing"}
            >
              <Bookmark className={`h-5 w-5 ${saved ? "fill-brand text-brand" : ""}`} />
            </button>
            <div className="relative">
              <button
                onClick={() => setMenu((value) => !value)}
                className="rounded-full p-2 hover:bg-accent"
                aria-label="More listing options"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              {menu && (
                <div className="absolute right-0 top-10 z-30 w-56 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                  <MenuItem icon={Share2} label="Share listing" onClick={() => void share()} />
                  <MenuItem
                    icon={UserPlus}
                    label={following ? "Unfollow seller" : "Follow seller"}
                    onClick={() => void follow()}
                  />
                  <MenuItem
                    icon={Eye}
                    label="View seller profile"
                    onClick={() =>
                      navigate({
                        to: "/u/$username",
                        params: { username: listing.seller.username },
                      })
                    }
                  />
                  <MenuItem
                    icon={Flag}
                    label="Report listing"
                    danger
                    onClick={() => {
                      setReportOpen(true);
                      setMenu(false);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-brand/15 via-brand/5 to-accent text-8xl">
            <span aria-label={listing.title}>{currentImage}</span>
            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
              {listing.featured && (
                <span className="rounded-full bg-brand px-2.5 py-1 text-[10px] font-black text-brand-foreground">
                  FEATURED
                </span>
              )}
              {listing.sponsored && (
                <span className="rounded-full bg-foreground/85 px-2.5 py-1 text-[10px] font-black text-background">
                  SPONSORED
                </span>
              )}
            </div>
            <span className="absolute bottom-3 left-3 rounded-lg bg-black/65 px-2 py-1 text-xs font-semibold text-white">
              {listing.images.length} photo{listing.images.length === 1 ? "" : "s"}
            </span>
            <span className="absolute bottom-3 right-3 rounded-lg bg-black/65 px-2 py-1 text-xs font-semibold text-white">
              Swipe gallery
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 p-3">
            {listing.images
              .concat(
                listing.images[0] ? [listing.images[0], listing.images[0], listing.images[0]] : [],
              )
              .slice(0, 4)
              .map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  onClick={() => setPhotoIndex(index % Math.max(1, listing.images.length))}
                  className={`flex aspect-square items-center justify-center rounded-xl border bg-accent/30 text-2xl ${index === photoIndex ? "border-brand bg-brand/10" : "border-border"}`}
                  aria-label={`View listing photo ${index + 1}`}
                >
                  {image}
                </button>
              ))}
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-brand" /> {listing.city}, {listing.state}
                {listing.lga ? ` · ${listing.lga}` : ""}
              </p>
              <h1 className="mt-2 text-xl font-black leading-tight">{listing.title}</h1>
              <p className="mt-2 text-2xl font-black text-brand">{priceText}</p>
              <p className="mt-1 text-[10px] font-semibold capitalize text-muted-foreground">
                {listing.priceType} · {listing.unit} · {listing.availability}
              </p>
            </div>
            {verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-1 text-[10px] font-bold text-brand">
                <BadgeCheck className="h-3.5 w-3.5" />{" "}
                {listing.seller.verification === "verified_business"
                  ? "Verified business"
                  : "Verified seller"}
              </span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => openChat()}
              disabled={toggles.disableChats}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-brand py-2.5 text-sm font-bold text-brand-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <MessageSquare className="h-4 w-4" /> Chat seller
            </button>
            <button
              onClick={() =>
                callsEnabled
                  ? openChat(
                      "Hello, I am interested in this listing. Please call me when convenient.",
                    )
                  : setNote("Seller calls are disabled in your Settings.")
              }
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-brand py-2.5 text-sm font-bold text-brand"
            >
              <Phone className="h-4 w-4" /> {callsEnabled ? "Request a call" : "Calls disabled"}
            </button>
          </div>
        </section>
        <section className="grid grid-cols-4 gap-2 rounded-2xl border border-border bg-card p-3 text-center">
          <Stat icon={Eye} label="Views" value={listing.stats.views.toLocaleString()} />
          <Stat icon={Bookmark} label="Saves" value={listing.stats.saves.toLocaleString()} />
          <Stat icon={Share2} label="Shares" value={listing.stats.shares.toLocaleString()} />
          <Stat
            icon={MessageSquare}
            label="Inquiries"
            value={listing.stats.inquiries.toLocaleString()}
          />
        </section>
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-black">Listing details</h2>
          <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
            <Spec label="Category" value={listing.category} />
            <Spec label="Subcategory" value={listing.subcategory} />
            <Spec label="Condition" value={listing.condition} />
            <Spec label="Availability" value={listing.availability} />
            {listing.quantity > 0 && (
              <Spec
                label="Quantity"
                value={`${listing.quantity} ${listing.unit.replace("per ", "")}`}
              />
            )}

            {/* Universal Dynamic Fields */}
            {listing.metadata &&
              Object.entries(listing.metadata).map(([key, value]) => {
                if (
                  !value ||
                  [
                    "priceType",
                    "priceUnit",
                    "negotiation",
                    "availability",
                    "quantity",
                    "unit",
                    "lga",
                    "contactName",
                    "contactPhone",
                    "promoId",
                    "videoLink",
                  ].includes(key)
                )
                  return null;
                return <Spec key={key} label={key.replace(/-/g, " ")} value={String(value)} />;
              })}

            <Spec label="Listed" value={new Date(listing.createdAt).toLocaleDateString()} />
          </div>
          <p className="mt-4 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
            {listing.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {listing.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-bold text-brand"
              >
                #{tag}
              </span>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-brand/30 bg-brand/5 p-4">
          <h2 className="flex items-center gap-1.5 font-black">
            <ShieldCheck className="h-4 w-4 text-brand" /> FarmX safety reminder
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Always verify products and sellers before making payment. Meet safely, inspect
            agricultural goods before payment, avoid suspicious transfers, and report misleading
            listings. FarmX does not hold or process private buyer-to-seller product payments.
          </p>
          <button
            onClick={() => setReportOpen(true)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-black text-brand"
          >
            <Flag className="h-3.5 w-3.5" /> Report suspicious listing
          </button>
        </section>
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-xl font-bold text-brand">
              {listing.seller.photo}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    to="/u/$username"
                    params={{ username: listing.seller.username }}
                    className="flex items-center gap-1 text-base font-black hover:text-brand"
                  >
                    {listing.seller.name}
                    {verified && <BadgeCheck className="h-4 w-4 text-brand" />}
                  </Link>
                  <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                    {listing.seller.type} seller · {listing.seller.location}
                  </p>
                </div>
                <button onClick={() => void follow()} className="text-xs font-black text-brand">
                  {following ? "Following" : "Follow"}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-lg bg-accent px-2 py-1">
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />{" "}
                  {listing.seller.rating} ({listing.seller.reviews} reviews)
                </span>
                <span className="rounded-lg bg-accent px-2 py-1">
                  {listing.seller.followers.toLocaleString()} followers
                </span>
                <span className="rounded-lg bg-accent px-2 py-1">
                  {listing.seller.activeListings} active ads
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              to="/u/$username"
              params={{ username: listing.seller.username }}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-border py-2.5 text-sm font-bold"
            >
              View profile <ChevronRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => void share()}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-border py-2.5 text-sm font-bold"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black">Chat with the seller</h2>
            {toggles.disableChats && (
              <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                Disabled in Settings
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              "Hello, is this available?",
              "What is the last price?",
              "Where can I inspect it?",
              "Please share pickup details.",
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => setChatText(prompt)}
                className="rounded-lg border border-brand/50 px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-brand/5"
              >
                {prompt}
              </button>
            ))}
          </div>
          <textarea
            value={chatText}
            onChange={(event) => setChatText(event.target.value)}
            placeholder="Write your message here"
            className="mt-3 min-h-24 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-brand"
          />
          <button
            onClick={() => openChat(chatText || undefined)}
            disabled={toggles.disableChats}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-brand-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" /> Start chat
          </button>
        </section>
        {related.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h2 className="font-black">Related listings</h2>
                <p className="text-[10px] text-muted-foreground">
                  Similar category, location, or keywords.
                </p>
              </div>
              <Link to="/market" className="text-xs font-semibold text-brand">
                View Market
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {related.map((item) => (
                <MarketListingCard key={item.id} listing={item} compact />
              ))}
            </div>
          </section>
        )}
        {note && (
          <p className="rounded-xl bg-brand/5 px-3 py-2 text-center text-xs font-semibold text-brand">
            {note}
          </p>
        )}
        {reportOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
            <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black">Report listing</h2>
                <button onClick={() => setReportOpen(false)} aria-label="Close report">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Help FarmX review suspicious or misleading marketplace content.
              </p>
              <label className="mt-4 block text-xs font-bold">
                Reason
                <select
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-sm"
                >
                  <option>Scam</option>
                  <option>Fake product</option>
                  <option>Wrong information</option>
                  <option>Duplicate listing</option>
                  <option>Wrong category</option>
                  <option>Prohibited content</option>
                  <option>Misleading price</option>
                  <option>Offensive content</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="mt-3 block text-xs font-bold">
                Additional details
                <textarea
                  value={reportDescription}
                  onChange={(event) => setReportDescription(event.target.value)}
                  className="mt-1 min-h-20 w-full rounded-xl border border-border bg-background p-2.5 text-sm"
                  placeholder="Optional"
                />
              </label>
              <button
                onClick={() => void submitReport()}
                className="mt-4 w-full rounded-xl bg-brand py-3 text-sm font-black text-brand-foreground"
              >
                Submit report
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <Icon className="h-4 w-4 text-brand" />
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="truncate text-xs font-black">{value}</p>
    </div>
  );
}
function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}
function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: typeof Share2;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold hover:bg-muted ${danger ? "text-red-600" : ""}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
