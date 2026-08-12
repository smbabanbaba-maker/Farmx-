import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { products } from "@/lib/mock-data";
import { usePrefs } from "@/lib/prefs";
import { useMessages } from "@/lib/messages-store";
import { useCommerce } from "@/lib/commerce-store";
import { PayModal } from "@/components/PayModal";
import {
  BadgeCheck,
  Circle,
  Clock,
  EyeOff,
  Flag,
  Heart,
  MapPin,
  MessageSquare,
  MoreVertical,
  PackageCheck,
  Phone,
  PhoneCall,
  Share2,
  ShieldCheck,
  Star,
  Tag,
  UserPlus,
} from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "Product details — FarmX Marketplace" },
      {
        name: "description",
        content:
          "Browse product details, trusted sellers, customer feedback and similar listings on FarmX.",
      },
      { property: "og:title", content: "FarmX marketplace listing" },
      { property: "og:description", content: "Product details, seller info and similar listings." },
    ],
  }),
  component: ProductPage,
});

const REVIEWS = [
  {
    id: "r1",
    name: "Musa A.",
    stars: 5,
    text: "Item arrived exactly as described. Smooth conversation with the seller.",
  },
  {
    id: "r2",
    name: "Grace O.",
    stars: 4,
    text: "Good item and responsive seller. Delivery took one extra day.",
  },
  {
    id: "r3",
    name: "Yusuf B.",
    stars: 5,
    text: "Trusted seller. I would buy from this shop again.",
  },
];

type Tab = "info" | "seller" | "similar";

function ProductPage() {
  const { id } = Route.useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isSaved, toggleSaved, toggleFollow, isFollowing, hideAd, hideSeller } = usePrefs();
  const { openConversationWith } = useMessages();
  const { createOrder, fundEscrow } = useCommerce();
  const [menu, setMenu] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [escrow, setEscrow] = useState(false);
  const [tab, setTab] = useState<Tab>("info");
  const [activeImage, setActiveImage] = useState(0);

  const product = products.find((item) => item.id === id) ?? products[0];
  const verified = product.rating >= 4.4;
  const gallery = [product.image, product.image, product.image, product.image];
  const similar = useMemo(
    () =>
      [
        ...products.filter((item) => item.id !== product.id && item.category === product.category),
        ...products,
      ]
        .filter(
          (item, index, list) =>
            item.id !== product.id &&
            list.findIndex((candidate) => candidate.id === item.id) === index,
        )
        .slice(0, 12),
    [product.id, product.category],
  );

  const chat = (text: string) => {
    const cid = openConversationWith(
      { name: product.seller, avatar: product.fallback, verified, location: product.location },
      {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        seller: product.seller,
      },
    );
    navigate({ to: "/messages/$id", params: { id: cid }, search: { q: text } as never });
  };

  const quickActions = [
    { label: "Last price", icon: Tag, run: () => chat("What is your last price?") },
    { label: "Ask location", icon: MapPin, run: () => chat("What is your exact location?") },
    { label: "Make an offer", icon: Tag, run: () => chat("I would like to make an offer.") },
    {
      label: "Please call me",
      icon: PhoneCall,
      run: () => chat("Please call me when you are available."),
    },
  ];

  return (
    <AppShell>
      <div className="space-y-4 pb-6">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{product.category}</p>
            <h1 className="text-xl font-bold leading-tight">{product.name}</h1>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => toggleSaved(product.id)}
              className="p-2 rounded-full hover:bg-accent"
              aria-label="Save product"
            >
              <Heart className={`h-5 w-5 ${isSaved(product.id) ? "fill-brand text-brand" : ""}`} />
            </button>
            <div className="relative">
              <button
                onClick={() => setMenu((open) => !open)}
                className="p-2 rounded-full hover:bg-accent"
                aria-label="Listing menu"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              {menu && (
                <div className="absolute right-0 mt-1 w-52 rounded-xl bg-card border border-border shadow-lg z-20 overflow-hidden">
                  <MenuItem
                    icon={Share2}
                    label="Share listing"
                    onClick={() => {
                      const url = typeof window !== "undefined" ? window.location.href : "";
                      navigator.clipboard?.writeText(url);
                      setMenu(false);
                      setNote("Listing link copied.");
                    }}
                  />
                  <MenuItem
                    icon={UserPlus}
                    label={isFollowing(product.seller) ? "Following seller" : "Follow seller"}
                    onClick={() => {
                      toggleFollow(product.seller);
                      setMenu(false);
                    }}
                  />
                  <MenuItem
                    icon={EyeOff}
                    label="Hide this listing"
                    onClick={() => {
                      hideAd(product.id);
                      setMenu(false);
                      navigate({ to: "/market" });
                    }}
                  />
                  <MenuItem
                    icon={EyeOff}
                    label="Hide seller listings"
                    onClick={() => {
                      hideSeller(product.seller);
                      setMenu(false);
                      navigate({ to: "/market" });
                    }}
                  />
                  <MenuItem
                    icon={Flag}
                    label="Report seller"
                    danger
                    onClick={() => {
                      setMenu(false);
                      setNote("Report received. Our support team will review it.");
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </header>

        <div
          className="grid grid-cols-3 rounded-xl bg-card border border-border p-1 gap-1"
          role="tablist"
          aria-label="Product sections"
        >
          {(
            [
              ["info", "Product info"],
              ["seller", "Seller info"],
              ["similar", "Similar products"],
            ] as Array<[Tab, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`rounded-lg px-2 py-2 text-[11px] sm:text-xs font-bold transition-colors ${tab === value ? "bg-brand text-brand-foreground shadow-sm" : "text-muted-foreground hover:bg-accent"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <section className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border bg-muted">
              <img
                src={gallery[activeImage]}
                alt={product.name}
                className="aspect-square w-full object-cover"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {gallery.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  onClick={() => setActiveImage(index)}
                  className={`overflow-hidden rounded-lg border-2 ${activeImage === index ? "border-brand" : "border-transparent"}`}
                  aria-label={`View image ${index + 1}`}
                >
                  <img src={image} alt="" className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
            <div>
              <p className="text-2xl font-bold text-brand">₦{product.price.toLocaleString()}</p>
              <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {product.location}, Nigeria · {product.condition}
              </p>
            </div>
            <div className="rounded-2xl bg-card border border-border p-4">
              <h2 className="font-bold">Description</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{product.description}</p>
              <h3 className="mt-4 font-bold text-sm">Specifications</h3>
              <dl className="mt-2 grid grid-cols-2 gap-2">
                {Object.entries(product.specs).map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-accent/40 p-2.5">
                    <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="mt-0.5 text-xs font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <section className="rounded-2xl border border-brand/40 bg-brand/5 p-4">
              <h2 className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-brand" /> Buyer protection
              </h2>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Use secure payment or pay on delivery. Always inspect an item and keep conversations
                on FarmX.
              </p>
              <button
                disabled={!verified}
                onClick={() => setEscrow(true)}
                className="mt-3 w-full py-2.5 rounded-xl bg-brand text-brand-foreground text-sm font-bold disabled:opacity-50"
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
                  setNote("Pay-on-delivery order started.");
                }}
                className="mt-2 w-full py-2.5 rounded-xl border border-border text-sm font-bold"
              >
                Pay on delivery
              </button>
            </section>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map(({ label, icon: Icon, run }) => (
                <button
                  key={label}
                  onClick={run}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-card border border-border text-xs font-semibold hover:border-brand"
                >
                  <Icon className="h-4 w-4 text-brand" /> {label}
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === "seller" && (
          <section className="space-y-3">
            <div className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-brand/10 grid place-items-center text-xl">
                  {product.fallback}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm flex items-center gap-1">
                    {product.seller}
                    {verified && <BadgeCheck className="h-4 w-4 text-brand" />}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {product.location}, Nigeria · Member since 2023
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                    <Circle className="h-2 w-2 fill-green-500 text-green-500" /> Online 2 hours ago
                  </p>
                </div>
                <button
                  onClick={() => chat("")}
                  className="px-3 py-2 rounded-lg bg-brand text-brand-foreground text-xs font-bold flex items-center gap-1"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Message
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="rounded-lg bg-accent/40 p-2">
                  <p className="text-sm font-bold">{product.rating}</p>
                  <p className="text-[10px] text-muted-foreground">Rating</p>
                </div>
                <div className="rounded-lg bg-accent/40 p-2">
                  <p className="text-sm font-bold">2 yrs</p>
                  <p className="text-[10px] text-muted-foreground">On FarmX</p>
                </div>
                <div className="rounded-lg bg-accent/40 p-2">
                  <p className="text-sm font-bold">~12m</p>
                  <p className="text-[10px] text-muted-foreground">Reply time</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">Buyer feedback</h2>
                <div className="flex items-center gap-0.5 text-xs font-bold">
                  <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" /> {product.rating}
                </div>
              </div>
              <div className="mt-3 space-y-3">
                {REVIEWS.map((review) => (
                  <Review key={review.id} {...review} />
                ))}
              </div>
              <button className="mt-4 text-xs font-bold text-brand">View all feedback</button>
            </div>
          </section>
        )}

        {tab === "similar" && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground">More in {product.category}</p>
                <h2 className="font-bold">Similar products</h2>
              </div>
              <span className="text-xs text-muted-foreground">{similar.length} items</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {similar.map((item) => (
                <Link
                  key={item.id}
                  to="/product/$id"
                  params={{ id: item.id }}
                  className="rounded-xl bg-card border border-border overflow-hidden hover:border-brand"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                  />
                  <div className="p-2.5">
                    <p className="text-xs font-semibold truncate">{item.name}</p>
                    <p className="mt-1 text-xs font-bold text-brand">
                      ₦{item.price.toLocaleString()}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5" /> {item.location}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
        {note && <p className="text-xs text-brand font-semibold text-center">{note}</p>}
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
          setNote("Secure payment started successfully.");
        }}
      />
    </AppShell>
  );
}

function Review({ name, stars, text }: { name: string; stars: number; text: string }) {
  return (
    <article>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{name}</p>
        <div className="flex">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              className={`h-3 w-3 ${index < stars ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`}
            />
          ))}
        </div>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
    </article>
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
      className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent text-left ${danger ? "text-brand" : ""}`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}
