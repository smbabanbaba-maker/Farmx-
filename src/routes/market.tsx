import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { products, PRICING } from "@/lib/mock-data";
import {
  Plus,
  Star,
  Search,
  MapPin,
  Sparkles,
  X,
  BadgeCheck,
  Crown,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { PayModal } from "@/components/PayModal";
import type { PaymentPurpose } from "@/lib/paystack";
import { useCompany, TIER_META } from "@/lib/company-store";
import { useMessages } from "@/lib/messages-store";

export const Route = createFileRoute("/market")({ component: Market });

function Market() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { state, isBadgeActive } = useCompany();
  const { openConversationWith } = useMessages();
  const [promoFor, setPromoFor] = useState<string | null>(null);
  const [pay, setPay] = useState<{ title: string; amount: number; purpose: PaymentPurpose } | null>(
    null,
  );

  const myCompanyName = state.company?.name.toLowerCase() ?? "";
  const badgeActive = isBadgeActive();
  const tierMeta = state.tier !== "none" ? TIER_META[state.tier] : null;

  return (
    <AppShell title={t("market")}>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search products…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card border border-border text-sm"
          />
        </div>

        {/* Upgrade CTA when badge is not active */}
        {!badgeActive && (
          <Link
            to="/upgrade"
            className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-brand/10 to-brand/5 border border-brand/30"
          >
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-brand" />
              <div>
                <p className="text-sm font-bold">Get verified</p>
                <p className="text-[11px] text-muted-foreground">
                  Bluetek badge on all your products
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-brand">Upgrade →</span>
          </Link>
        )}

        <button
          onClick={() => navigate({ to: "/post-product" })}
          className="w-full py-2.5 rounded-xl bg-brand text-brand-foreground font-semibold flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" /> {t("addProduct")}
        </button>
        <div className="grid grid-cols-2 gap-3">
          {products.map((p) => (
            <div
              key={p.id}
              className="rounded-xl bg-card border border-border overflow-hidden relative"
            >
              {p.promoted && (
                <span className="absolute top-1.5 left-1.5 z-10 text-[9px] px-1.5 py-0.5 rounded-full bg-brand text-brand-foreground font-bold">
                  PROMO
                </span>
              )}
              <div className="aspect-square bg-brand/5 flex items-center justify-center text-5xl">
                {p.image}
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  {p.seller}
                  {badgeActive &&
                    myCompanyName &&
                    p.seller.toLowerCase().includes(myCompanyName.split(" ")[0]) &&
                    tierMeta && (
                      <span title={`${tierMeta.label} verified`}>
                        {state.tier === "platinum" ? (
                          <Crown className="h-3 w-3" style={{ color: tierMeta.color }} />
                        ) : state.tier === "gold" ? (
                          <Sparkles className="h-3 w-3" style={{ color: tierMeta.color }} />
                        ) : (
                          <BadgeCheck className="h-3 w-3" style={{ color: tierMeta.color }} />
                        )}
                      </span>
                    )}
                </p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                  <MapPin className="h-2.5 w-2.5" />
                  {p.location}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-sm font-bold text-brand">₦{p.price.toLocaleString()}</span>
                  <span className="flex items-center gap-0.5 text-xs">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    {p.rating}
                  </span>
                </div>
                <div className="mt-2 flex gap-1.5">
                  <button
                    onClick={() => {
                      const cid = openConversationWith(
                        { name: p.seller, avatar: "🌾", verified: true, location: p.location },
                        {
                          id: p.id,
                          name: p.name,
                          price: p.price,
                          image: p.image,
                          seller: p.seller,
                        },
                      );
                      navigate({ to: "/messages/$id", params: { id: cid } });
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-brand text-brand-foreground text-[11px] font-semibold flex items-center justify-center gap-1"
                  >
                    <MessageSquare className="h-3 w-3" /> Message
                  </button>
                  {!p.promoted && (
                    <button
                      onClick={() => setPromoFor(p.id)}
                      className="py-1.5 px-2 rounded-lg border border-brand text-brand text-[11px] font-semibold flex items-center justify-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add product now uses full posting flow at /post-product */}

      {/* Promo tier picker */}
      {promoFor && (
        <PromoSheet
          onClose={() => setPromoFor(null)}
          onPick={(tier) => {
            const amount = tier === "week" ? PRICING.promoWeek : PRICING.promoMonth;
            setPay({
              title: `Promo — ${tier === "week" ? "Sati ɗaya" : "Wata ɗaya"}`,
              amount,
              purpose:
                tier === "week"
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
        purpose={pay?.purpose ?? { kind: "listing_fee" }}
      />
    </AppShell>
  );
}

function ConfirmSheet({
  title,
  body,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{body}</p>
        <button
          onClick={onConfirm}
          className="mt-4 w-full py-2.5 rounded-xl bg-brand text-brand-foreground font-semibold"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

function PromoSheet({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (t: "week" | "month") => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold">Boost Listing</h3>
            <p className="text-xs text-muted-foreground">Zaɓi lokacin promo</p>
          </div>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-2">
          <button
            onClick={() => onPick("week")}
            className="w-full p-3 rounded-xl border border-border flex items-center justify-between hover:border-brand"
          >
            <div className="text-left">
              <p className="font-semibold text-sm">Sati ɗaya</p>
              <p className="text-xs text-muted-foreground">7 kwanaki a saman search</p>
            </div>
            <span className="font-bold text-brand">₦{PRICING.promoWeek.toLocaleString()}</span>
          </button>
          <button
            onClick={() => onPick("month")}
            className="w-full p-3 rounded-xl border border-border flex items-center justify-between hover:border-brand"
          >
            <div className="text-left">
              <p className="font-semibold text-sm">Wata ɗaya</p>
              <p className="text-xs text-muted-foreground">30 kwanaki + banner spotlight</p>
            </div>
            <span className="font-bold text-brand">₦{PRICING.promoMonth.toLocaleString()}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
