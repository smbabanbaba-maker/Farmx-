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
  Star,
  MapPin,
  MoreVertical,
  Share2,
  UserPlus,
  EyeOff,
  Flag,
  Phone,
  PhoneCall,
  Tag,
  PackageCheck,
  ShieldCheck,
  MessageSquare,
  Heart,
  Clock,
  Circle,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "Product details — FarmX Market" },
      {
        name: "description",
        content:
          "See product photos, price, seller verification, customer reviews and buyer protection options on FarmX.",
      },
      { property: "og:title", content: "FarmX product details" },
      {
        property: "og:description",
        content: "Product photos, price, verified seller info and buyer protection.",
      },
    ],
  }),
  component: ProductPage,
});

const REVIEWS = [
  { id: "r1", name: "Musa A.", stars: 5, text: "Kaya ya zo lafiya, quality mai kyau sosai." },
  { id: "r2", name: "Grace O.", stars: 4, text: "Good product, delivery was one day late." },
  { id: "r3", name: "Yusuf B.", stars: 5, text: "Verified seller, na sake saye karo na biyu." },
];

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

  const product = products.find((p) => p.id === id) ?? products[0];
  const similar = products.filter((p) => p.id !== product.id).slice(0, 4);
  const verified = product.rating >= 4.4;

  const chat = (text: string) => {
    const cid = openConversationWith(
      { name: product.seller, avatar: product.image, verified, location: product.location },
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

  const actions = [
    { label: t("makeOffer"), icon: Tag, run: () => chat(t("makeOffer")) },
    { label: t("requestCallBack"), icon: PhoneCall, run: () => chat(t("pleaseCallMe")) },
    {
      label: t("call"),
      icon: Phone,
      run: () => {
        window.location.href = "tel:+2348000000000";
      },
    },
    { label: t("askLastPrice"), icon: Tag, run: () => chat(t("askLastPrice")) },
    { label: t("checkAvailability"), icon: PackageCheck, run: () => chat(t("checkAvailability")) },
    { label: t("reportAbuse"), icon: Flag, run: () => setNote(t("reportAbuse") + " ✓") },
  ];

  return (
    <AppShell>
      <div className="space-y-5 pb-6">
        <div className="flex items-start justify-between">
          <h1 className="text-xl font-bold flex-1 pr-2">{product.name}</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => toggleSaved(product.id)}
              className="p-2 rounded-full hover:bg-accent"
              aria-label={t("savedAds")}
            >
              <Heart className={`h-5 w-5 ${isSaved(product.id) ? "fill-brand text-brand" : ""}`} />
            </button>
            <div className="relative">
              <button
                onClick={() => setMenu(!menu)}
                className="p-2 rounded-full hover:bg-accent"
                aria-label="menu"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              {menu && (
                <div className="absolute right-0 mt-1 w-52 rounded-xl bg-card border border-border shadow-lg z-20 overflow-hidden">
                  <MenuItem
                    icon={Share2}
                    label={t("shareAd")}
                    onClick={() => {
                      const url = typeof window !== "undefined" ? window.location.href : "";
                      if (typeof navigator !== "undefined" && navigator.share)
                        navigator.share({ title: product.name, url }).catch(() => {});
                      else if (typeof navigator !== "undefined")
                        navigator.clipboard?.writeText(url);
                      setMenu(false);
                      setNote("🔗 " + t("shareAd"));
                    }}
                  />
                  <MenuItem
                    icon={UserPlus}
                    label={
                      isFollowing(product.seller) ? "✓ " + t("followSeller") : t("followSeller")
                    }
                    onClick={() => {
                      toggleFollow(product.seller);
                      setMenu(false);
                    }}
                  />
                  <MenuItem
                    icon={EyeOff}
                    label={t("hideAd")}
                    onClick={() => {
                      hideAd(product.id);
                      setMenu(false);
                      navigate({ to: "/market" });
                    }}
                  />
                  <MenuItem
                    icon={EyeOff}
                    label={t("hideAdsFromSeller")}
                    onClick={() => {
                      hideSeller(product.seller);
                      setMenu(false);
                      navigate({ to: "/market" });
                    }}
                  />
                  <MenuItem
                    icon={Flag}
                    label={t("reportSeller")}
                    danger
                    onClick={() => {
                      setMenu(false);
                      setNote(t("reportSeller") + " ✓");
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="aspect-square rounded-2xl bg-brand/5 border border-border flex items-center justify-center text-8xl">
          {product.image}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-brand/5 border border-border flex items-center justify-center text-2xl"
            >
              {product.image}
            </div>
          ))}
        </div>

        <div>
          <p className="text-2xl font-bold text-brand">₦{product.price.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="h-3 w-3" /> {product.location}, Nigeria
          </p>
        </div>

        <section>
          <h2 className="font-bold mb-1">{t("description")}</h2>
          <p className="text-sm text-muted-foreground">
            {product.name} — clean, farm-fresh stock ready for pickup or delivery. Bulk orders
            welcome, price negotiable for quantities above 10 units.
          </p>
        </section>

        {/* Seller info */}
        <section className="rounded-2xl bg-card border border-border p-4">
          <h2 className="font-bold mb-2">{t("sellerInfo")}</h2>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center text-xl">
              {product.image}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm flex items-center gap-1">
                {product.seller}
                {verified && <BadgeCheck className="h-4 w-4 text-brand" />}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Circle className="h-2 w-2 fill-green-500 text-green-500" /> {t("online")}
              </p>
            </div>
            <button
              onClick={() => chat("")}
              className="px-3 py-2 rounded-lg bg-brand text-brand-foreground text-xs font-bold flex items-center gap-1"
            >
              <MessageSquare className="h-3.5 w-3.5" /> {t("messageSeller")}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div className="rounded-lg bg-accent/40 p-2">
              <p className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> {t("replySpeed")}
              </p>
              <p className="font-semibold mt-0.5">~12 min</p>
            </div>
            <div className="rounded-lg bg-accent/40 p-2">
              <p className="text-muted-foreground">{t("memberSince")}</p>
              <p className="font-semibold mt-0.5">2023 · 2 yrs</p>
            </div>
          </div>
        </section>

        {/* Buyer protection */}
        <section className="rounded-2xl border border-brand/40 bg-brand/5 p-4">
          <h2 className="font-bold flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-brand" /> {t("buyerProtection")}
          </h2>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>
              • <span className="font-semibold text-foreground">{t("escrow")}:</span>{" "}
              {t("escrowDesc")}
            </li>
            <li>
              • <span className="font-semibold text-foreground">{t("payOnDelivery")}</span>
            </li>
            <li>
              • <span className="font-semibold text-foreground">{t("refundPolicy")}:</span>{" "}
              {t("refundDesc")}
            </li>
            <li>• {t("verifiedOnly")}</li>
          </ul>
          <button
            disabled={!verified}
            onClick={() => setEscrow(true)}
            className="mt-3 w-full py-2.5 rounded-xl bg-brand text-brand-foreground text-sm font-bold disabled:opacity-50"
          >
            {t("payWithEscrow")} · ₦{product.price.toLocaleString()}
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
              setNote("🚚 " + t("payOnDelivery"));
            }}
            className="mt-2 w-full py-2.5 rounded-xl border border-border text-sm font-bold"
          >
            {t("payOnDelivery")}
          </button>
          <Link
            to="/orders"
            className="mt-2 block text-center text-[11px] text-brand font-semibold"
          >
            {t("orders")} →
          </Link>
          <Link
            to="/buyer-protection"
            className="mt-2 block text-center text-[11px] text-brand font-semibold"
          >
            {t("buyerProtection")} →
          </Link>
        </section>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.run}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-card border border-border text-xs font-semibold hover:border-brand"
            >
              <a.icon className="h-4 w-4 text-brand" /> <span className="truncate">{a.label}</span>
            </button>
          ))}
        </div>
        {note && <p className="text-xs text-brand font-semibold text-center">{note}</p>}

        {/* Reviews */}
        <section>
          <h2 className="font-bold mb-2">{t("reviews")}</h2>
          <div className="space-y-2">
            {REVIEWS.map((r) => (
              <div key={r.id} className="p-3 rounded-xl bg-card border border-border">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{r.name}</p>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${i < r.stars ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{r.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Similar ads */}
        <section>
          <h2 className="font-bold mb-2">{t("similarAds")}</h2>
          <div className="grid grid-cols-2 gap-2">
            {similar.map((p) => (
              <Link
                key={p.id}
                to="/product/$id"
                params={{ id: p.id }}
                className="rounded-xl bg-card border border-border overflow-hidden hover:border-brand"
              >
                <div className="aspect-square bg-brand/5 flex items-center justify-center text-4xl">
                  {p.image}
                </div>
                <div className="p-2">
                  <p className="text-xs font-semibold truncate">{p.name}</p>
                  <p className="text-xs font-bold text-brand">₦{p.price.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <MapPin className="h-2.5 w-2.5" />
                    {p.location}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <PayModal
        open={escrow}
        onClose={() => setEscrow(false)}
        title={`${t("escrow")} — ${product.name}`}
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
          setNote("🔒 " + t("escrowDesc"));
        }}
      />
    </AppShell>
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
