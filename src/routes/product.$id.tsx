import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { products } from "@/lib/mock-data";
import { usePrefs } from "@/lib/prefs";
import { useMessages } from "@/lib/messages-store";
import { useCommerce } from "@/lib/commerce-store";
import { PayModal } from "@/components/PayModal";
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Copy,
  Flag,
  HandCoins,
  Heart,
  MapPin,
  MessageSquare,
  MoreVertical,
  PackageCheck,
  Phone,
  Send,
  Share2,
  ShieldCheck,
  Star,
  Tag,
  UserPlus,
  EyeOff,
} from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "Product details — FarmX Market" },
      {
        name: "description",
        content:
          "See detailed product, seller feedback, buyer protection and contact options on FarmX.",
      },
    ],
  }),
  component: ProductPage,
});

const REVIEWS = [
  {
    id: "r1",
    name: "Amina Yusuf",
    date: "Recently",
    stars: 5,
    text: "Kaya ya zo lafiya, ingancinsa ya yi kyau kuma mai sayarwa ya amsa da sauri.",
  },
  {
    id: "r2",
    name: "Salisu Musa",
    date: "2 weeks ago",
    stars: 5,
    text: "Honest seller. Na samu abin da aka bayyana a talla, zan sake saya.",
  },
  {
    id: "r3",
    name: "Grace O.",
    date: "1 month ago",
    stars: 4,
    text: "Good quality and smooth pickup process. Recommended for bulk orders.",
  },
];

function ProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { isSaved, toggleSaved, toggleFollow, isFollowing, hideAd, hideSeller } = usePrefs();
  const { openConversationWith } = useMessages();
  const { createOrder, fundEscrow } = useCommerce();
  const [menu, setMenu] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [escrow, setEscrow] = useState(false);
  const [chatText, setChatText] = useState("");
  const [showAllReviews, setShowAllReviews] = useState(false);

  const product = products.find((item) => item.id === id) ?? products[0];
  const verified = product.rating >= 4.4;
  const similar = useMemo(
    () => products.filter((item) => item.id !== product.id).slice(0, 4),
    [product.id],
  );
  const priceLow = Math.round(product.price * 0.92);
  const priceHigh = Math.round(product.price * 1.1);
  const sellerInitial = product.seller.charAt(0).toUpperCase();
  const reviewList = showAllReviews ? REVIEWS : REVIEWS.slice(0, 2);

  const openChat = (message = "") => {
    const conversationId = openConversationWith(
      { name: product.seller, avatar: product.image, verified, location: product.location },
      {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        seller: product.seller,
      },
    );
    navigate({
      to: "/messages/$id",
      params: { id: conversationId },
      search: { q: message } as never,
    });
  };

  const shareAd = () => {
    const url = typeof window === "undefined" ? "" : window.location.href;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: product.name, url }).catch(() => undefined);
    } else if (typeof navigator !== "undefined") {
      navigator.clipboard?.writeText(url);
      setNote("Link copied for sharing.");
    }
    setMenu(false);
  };

  return (
    <AppShell>
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
              onClick={() => toggleSaved(product.id)}
              className="rounded-full p-2 hover:bg-accent"
              aria-label={isSaved(product.id) ? "Remove from saved" : "Save product"}
            >
              <Bookmark
                className={`h-5 w-5 ${isSaved(product.id) ? "fill-brand text-brand" : ""}`}
              />
            </button>
            <div className="relative">
              <button
                onClick={() => setMenu((open) => !open)}
                className="rounded-full p-2 hover:bg-accent"
                aria-label="More options"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              {menu && (
                <div className="absolute right-0 top-10 z-30 w-56 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                  <MenuItem icon={Share2} label="Share this ad" onClick={shareAd} />
                  <MenuItem
                    icon={UserPlus}
                    label={
                      isFollowing(product.seller) ? "Following this seller" : "Follow this seller"
                    }
                    onClick={() => {
                      toggleFollow(product.seller);
                      setMenu(false);
                    }}
                  />
                  <MenuItem
                    icon={EyeOff}
                    label="Hide this ad"
                    onClick={() => {
                      hideAd(product.id);
                      setMenu(false);
                      navigate({ to: "/market" });
                    }}
                  />
                  <MenuItem
                    icon={EyeOff}
                    label="Hide ads from this seller"
                    onClick={() => {
                      hideSeller(product.seller);
                      setMenu(false);
                      navigate({ to: "/market" });
                    }}
                  />
                  <MenuItem
                    icon={Flag}
                    label="Report this seller"
                    danger
                    onClick={() => {
                      setMenu(false);
                      setNote("Report received. FarmX will review it.");
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="relative aspect-[4/3] bg-gradient-to-br from-brand/15 via-brand/5 to-accent flex items-center justify-center text-8xl">
            {product.promoted && (
              <span className="absolute left-3 top-3 rounded-full bg-brand px-2.5 py-1 text-[10px] font-bold text-brand-foreground">
                PROMO
              </span>
            )}
            <span aria-label={product.name}>{product.image}</span>
            <span className="absolute bottom-3 left-3 rounded-lg bg-black/65 px-2 py-1 text-xs font-semibold text-white">
              4 photos
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 p-3">
            {[0, 1, 2, 3].map((index) => (
              <button
                key={index}
                onClick={() => setNote(`Photo ${index + 1} selected`)}
                className={`aspect-square rounded-xl border flex items-center justify-center text-2xl ${index === 0 ? "border-brand bg-brand/10" : "border-border bg-accent/30"}`}
                aria-label={`View product photo ${index + 1}`}
              >
                {product.image}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-brand" /> {product.location}, Nigeria · Listed
                today
              </p>
              <h1 className="mt-2 text-xl font-bold leading-tight">{product.name}</h1>
              <p className="mt-2 text-2xl font-black text-brand">
                ₦{product.price.toLocaleString()}
              </p>
            </div>
            {verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-1 text-[10px] font-bold text-brand">
                <BadgeCheck className="h-3.5 w-3.5" /> Verified
              </span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => openChat("Please call me about this listing.")}
              className="rounded-xl border border-brand py-2.5 text-sm font-bold text-brand hover:bg-brand/5"
            >
              Request call back
            </button>
            <button
              onClick={() => {
                window.location.href = "tel:+2348000000000";
              }}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-brand py-2.5 text-sm font-bold text-brand-foreground"
            >
              <Phone className="h-4 w-4" /> Call seller
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">FarmX market price guide</p>
              <p className="mt-1 text-sm font-semibold">
                ₦{priceLow.toLocaleString()} – ₦{priceHigh.toLocaleString()}
              </p>
            </div>
            <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs font-bold text-green-600">
              Fair price
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-bold">Chat with the seller</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Make an offer", "Is this available?", "Last price", "Ask location"].map((prompt) => (
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
            onClick={() => openChat(chatText)}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-brand-foreground"
          >
            <Send className="h-4 w-4" /> Start chat
          </button>
        </section>

        <section className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-3 text-center">
          <Stat icon="🌾" label="Condition" value="Quality checked" />
          <Stat icon="📦" label="Availability" value="In stock" />
          <Stat icon="🚚" label="Delivery" value="Pickup or delivery" />
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-bold">Product details</h2>
          <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
            <Spec label="Condition" value="Fresh / quality checked" />
            <Spec label="Category" value="Agricultural products" />
            <Spec label="Location" value={product.location} />
            <Spec label="Bulk orders" value="Available" />
            <Spec label="Negotiation" value="Open to offers" />
            <Spec label="Payment" value="Paystack protected" />
          </div>
          <p className="mt-4 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
            Fresh, quality-checked {product.name.toLowerCase()} from {product.seller}. Buyers can
            inspect at pickup or agree a delivery plan directly with the seller. Bulk orders are
            welcome.
          </p>
          <button
            onClick={() => openChat("I want to make an offer for this product.")}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand py-2.5 text-sm font-bold text-brand hover:bg-brand/5"
          >
            <HandCoins className="h-4 w-4" /> Make an offer
          </button>
        </section>

        <section className="rounded-2xl border border-brand/30 bg-brand/5 p-4">
          <h2 className="flex items-center gap-1.5 font-bold">
            <ShieldCheck className="h-4 w-4 text-brand" /> Buyer protection
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Pay securely, keep messages inside FarmX, and inspect items before confirming delivery.
          </p>
          <button
            onClick={() => setEscrow(true)}
            className="mt-3 w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-brand-foreground"
          >
            Secure payment · ₦{product.price.toLocaleString()}
          </button>
          <button
            onClick={() => {
              createOrder({
                productId: product.id,
                title: product.name,
                seller: product.seller,
                sellerVerified: verified,
                amount: product.price,
                method: "pod",
              });
              setNote("Pay on delivery order started.");
            }}
            className="mt-2 w-full rounded-xl border border-border py-2.5 text-sm font-bold"
          >
            Pay on delivery
          </button>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-xl font-bold text-brand">
              {sellerInitial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1 text-base font-bold">
                    {product.seller}
                    {verified && <BadgeCheck className="h-4 w-4 text-brand" />}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Seller on FarmX for 2+ years · {product.location}
                  </p>
                </div>
                <button
                  onClick={() => toggleFollow(product.seller)}
                  className="text-xs font-bold text-brand"
                >
                  {isFollowing(product.seller) ? "Following" : "Follow"}
                </button>
              </div>
              <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-accent px-2 py-1 text-[11px] text-muted-foreground">
                <Clock3 className="h-3 w-3" /> Typically replies within a few hours
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <p className="font-bold text-sm">Feedback about seller</p>
            <button
              onClick={() => setShowAllReviews(true)}
              className="inline-flex items-center gap-0.5 text-xs font-bold text-brand"
            >
              View all ({REVIEWS.length}) <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {reviewList.map((review) => (
              <Review key={review.id} review={review} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => toggleSaved(product.id)}
              className="rounded-xl border border-border py-2.5 text-sm font-bold"
            >
              {isSaved(product.id) ? "Saved" : "Save ad"}
            </button>
            <button
              onClick={() => setNote("Report received. Thank you for helping keep FarmX safe.")}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-brand py-2.5 text-sm font-bold text-brand"
            >
              <Flag className="h-4 w-4" /> Report abuse
            </button>
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">Similar ads</h2>
            <Link to="/market" className="text-xs font-semibold text-brand">
              View market
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {similar.map((item) => (
              <Link
                key={item.id}
                to="/product/$id"
                params={{ id: item.id }}
                className="overflow-hidden rounded-xl border border-border bg-card hover:border-brand"
              >
                <div className="aspect-square bg-brand/5 flex items-center justify-center text-4xl">
                  {item.image}
                </div>
                <div className="p-2">
                  <p className="truncate text-xs font-semibold">{item.name}</p>
                  <p className="mt-1 text-xs font-bold text-brand">
                    ₦{item.price.toLocaleString()}
                  </p>
                  <p className="mt-0.5 flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <MapPin className="h-2.5 w-2.5" />
                    {item.location}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {note && <p className="text-center text-xs font-semibold text-brand">{note}</p>}
      </div>

      <PayModal
        open={escrow}
        onClose={() => setEscrow(false)}
        title={`Secure payment — ${product.name}`}
        amountNaira={product.price}
        purpose={{ kind: "escrow", productId: product.id }}
        onPaid={(_via, reference) => {
          const order = createOrder({
            productId: product.id,
            title: product.name,
            seller: product.seller,
            sellerVerified: verified,
            amount: product.price,
            method: "escrow",
          });
          if (order) fundEscrow(order.id, reference);
          setEscrow(false);
          setNote("Secure payment has been recorded.");
        }}
      />
    </AppShell>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-1">
      <span className="text-2xl">{icon}</span>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-bold text-center">{value}</p>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

function Review({ review }: { review: (typeof REVIEWS)[number] }) {
  return (
    <div className="rounded-xl bg-accent/50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">{review.name}</p>
        <span className="text-[10px] text-muted-foreground">{review.date}</span>
      </div>
      <div className="mt-1 flex">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={`h-3.5 w-3.5 ${index < review.stars ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs leading-5 text-foreground/80">{review.text}</p>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Share2;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-accent ${danger ? "text-brand" : ""}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
