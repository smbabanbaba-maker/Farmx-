import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import {
  useCommerce,
  ORDER_LABEL,
  DISPUTE_REASONS,
  ESCROW_AUTO_RELEASE_DAYS,
  type Order,
} from "@/lib/commerce-store";
import {
  PackageCheck,
  ShieldCheck,
  Truck,
  AlertTriangle,
  Clock,
  ChevronRight,
  Megaphone,
} from "lucide-react";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "My Orders & Escrow — Goall26" },
      {
        name: "description",
        content:
          "Track Goall26 orders, escrow funds held until delivery, promo expiry and refund claims in one place.",
      },
      { property: "og:title", content: "Goall26 Orders & Escrow" },
      {
        property: "og:description",
        content: "Escrow status, delivery confirmation and refund claims.",
      },
    ],
  }),
  component: OrdersPage,
});

const STATUS_COLOR: Record<string, string> = {
  awaiting_payment: "bg-amber-500/15 text-amber-600",
  funds_held: "bg-blue-500/15 text-blue-600",
  shipped: "bg-indigo-500/15 text-indigo-600",
  delivered: "bg-cyan-500/15 text-cyan-600",
  released: "bg-green-500/15 text-green-600",
  disputed: "bg-brand/15 text-brand",
  refunded: "bg-purple-500/15 text-purple-600",
  cancelled: "bg-muted text-muted-foreground",
};

function OrdersPage() {
  const { t } = useI18n();
  const {
    orders,
    promos,
    fundEscrow,
    markShipped,
    confirmReceived,
    cancelOrder,
    openDispute,
    disputeForOrder,
  } = useCommerce();
  const [claim, setClaim] = useState<Order | null>(null);
  const [reason, setReason] = useState(DISPUTE_REASONS[0]);
  const [details, setDetails] = useState("");
  const [evidence, setEvidence] = useState("");

  const submitClaim = () => {
    if (!claim) return;
    openDispute(
      claim.id,
      reason,
      details,
      evidence
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean),
    );
    setClaim(null);
    setDetails("");
    setEvidence("");
  };

  return (
    <AppShell title={t("orders")}>
      <div className="space-y-3 pb-6">
        {promos.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="font-bold text-sm flex items-center gap-1.5">
              <Megaphone className="h-4 w-4 text-brand" /> {t("activePromos")}
            </p>
            {promos.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs mt-2">
                <span className="truncate">{p.productTitle}</span>
                <span className="text-muted-foreground">
                  {t("expires")} {new Date(p.expiresAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {orders.length === 0 && (
          <div className="text-center py-14">
            <ShieldCheck className="h-10 w-10 text-brand mx-auto" />
            <p className="mt-3 font-semibold">{t("noOrders")}</p>
            <Link
              to="/market"
              className="mt-4 inline-block px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-bold"
            >
              {t("market")}
            </Link>
          </div>
        )}

        {orders.map((o) => {
          const d = disputeForOrder(o.id);
          return (
            <div key={o.id} className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{o.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.seller} · {new Date(o.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <p className="font-bold text-brand text-sm">₦{o.amount.toLocaleString()}</p>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLOR[o.status]}`}
                >
                  {ORDER_LABEL[o.status]}
                </span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  {o.method === "escrow" ? (
                    <>
                      <ShieldCheck className="h-3 w-3" /> {t("escrow")}
                    </>
                  ) : (
                    <>
                      <Truck className="h-3 w-3" /> {t("payOnDelivery")}
                    </>
                  )}
                </span>
              </div>

              <ol className="mt-3 space-y-1">
                {o.timeline.map((e, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground flex gap-2">
                    <Clock className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>
                      {e.label} ·{" "}
                      {new Date(e.at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {o.status === "awaiting_payment" && (
                  <button
                    onClick={() => fundEscrow(o.id, `esc_${Date.now()}`)}
                    className="col-span-2 py-2 rounded-lg bg-brand text-brand-foreground text-xs font-bold"
                  >
                    {t("fundEscrow")}
                  </button>
                )}
                {o.status === "funds_held" && (
                  <button
                    onClick={() => markShipped(o.id)}
                    className="py-2 rounded-lg border border-border text-xs font-semibold"
                  >
                    {t("markShipped")}
                  </button>
                )}
                {(o.status === "funds_held" ||
                  o.status === "shipped" ||
                  o.status === "delivered") && (
                  <button
                    onClick={() => confirmReceived(o.id)}
                    className="py-2 rounded-lg bg-brand text-brand-foreground text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <PackageCheck className="h-3.5 w-3.5" /> {t("confirmReceived")}
                  </button>
                )}
                {["funds_held", "shipped", "delivered"].includes(o.status) && !d && (
                  <button
                    onClick={() => setClaim(o)}
                    className="py-2 rounded-lg border border-brand text-brand text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" /> {t("fileClaim")}
                  </button>
                )}
                {o.status === "awaiting_payment" && (
                  <button
                    onClick={() => cancelOrder(o.id)}
                    className="col-span-2 py-2 rounded-lg border border-border text-xs font-semibold"
                  >
                    {t("cancel")}
                  </button>
                )}
                {d && (
                  <Link
                    to="/disputes"
                    className="col-span-2 py-2 rounded-lg bg-accent text-xs font-bold flex items-center justify-center gap-1"
                  >
                    {t("viewClaim")} <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>

              {o.method === "escrow" &&
                ["funds_held", "shipped", "delivered"].includes(o.status) && (
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    {t("autoReleaseNote")} ({ESCROW_AUTO_RELEASE_DAYS} {t("days")})
                  </p>
                )}
            </div>
          );
        })}
      </div>

      {claim && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
          onClick={() => setClaim(null)}
        >
          <div
            className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold">
              {t("fileClaim")} — {claim.title}
            </h3>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm"
            >
              {DISPUTE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 600))}
              rows={3}
              placeholder={t("claimDetails")}
              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm"
            />
            <input
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder={t("evidenceHint")}
              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm"
            />
            <button
              onClick={submitClaim}
              className="w-full py-2.5 rounded-xl bg-brand text-brand-foreground text-sm font-bold"
            >
              {t("submitClaim")}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
