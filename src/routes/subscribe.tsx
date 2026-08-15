import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useSubscription, TIERS, FREE_QUOTA, type TierId } from "@/lib/subscription";
import {
  cancelSubscription,
  getSubscriptionSummary,
  setSubscriptionAutoRenew,
} from "@/lib/subscription.functions";
import type { UserSubscription } from "@/lib/subscription.types";
import { PayModal } from "@/components/PayModal";
import { Check, Crown, Infinity as InfinityIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export const Route = createFileRoute("/subscribe")({
  head: () => ({
    meta: [
      { title: "Subscription Plans — FarmX" },
      {
        name: "description",
        content:
          "Free listing quota then flexible FarmX plans from Basic to Enterprise Lux, payable in two monthly installments.",
      },
      { property: "og:title", content: "FarmX Subscription Plans" },
      {
        property: "og:description",
        content: "Basic to Enterprise Lux plans, each split into two installments.",
      },
    ],
  }),
  component: SubscribePage,
});

function SubscribePage() {
  const { t } = useI18n();
  const { state, tier, freeLeft, listingsLeft, activateTier, paySecondInstallment } =
    useSubscription();
  const [pending, setPending] = useState<{
    id: TierId;
    amount: number;
    title: string;
    second?: boolean;
  } | null>(null);
  const [serverSubscription, setServerSubscription] = useState<UserSubscription | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverBusy, setServerBusy] = useState(false);

  const loadServerSubscription = useCallback(async () => {
    try {
      const summary = await getSubscriptionSummary();
      setServerSubscription(summary);
      setServerError(null);
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Unable to load subscription status.",
      );
    }
  }, []);

  useEffect(() => {
    void loadServerSubscription();
  }, [loadServerSubscription]);

  const toggleAutoRenew = async () => {
    if (!serverSubscription) return;
    setServerBusy(true);
    try {
      const updated = await setSubscriptionAutoRenew({
        data: { enabled: !serverSubscription.autoRenew },
      });
      setServerSubscription(updated);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Unable to update auto-renewal.");
    } finally {
      setServerBusy(false);
    }
  };

  const endSubscription = async () => {
    if (!window.confirm("Cancel auto-renewal for this FarmX subscription?")) return;
    setServerBusy(true);
    try {
      const updated = await cancelSubscription();
      setServerSubscription(updated);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Unable to cancel subscription.");
    } finally {
      setServerBusy(false);
    }
  };

  return (
    <AppShell title={t("subscription")}>
      <div className="space-y-4 pb-6">
        <div className="rounded-2xl p-4 bg-card border border-border">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("currentPlan")}
          </p>
          <p className="text-lg font-bold mt-0.5">
            {serverSubscription
              ? serverSubscription.tier
              : tier
                ? tier.name
                : `${t("freeQuota")} (${FREE_QUOTA})`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {serverSubscription?.listingLimit !== undefined
              ? `${serverSubscription.activeListings ?? 0}/${serverSubscription.listingLimit} active listings`
              : listingsLeft === "unlimited"
                ? t("unlimitedListings")
                : `${listingsLeft} ${t("quotaLeft")}`}
          </p>
          {serverSubscription && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-accent/40 p-2">
                <p className="text-muted-foreground">Status</p>
                <p className="mt-0.5 font-bold">{serverSubscription.status}</p>
              </div>
              <div className="rounded-xl bg-accent/40 p-2">
                <p className="text-muted-foreground">Remaining days</p>
                <p className="mt-0.5 font-bold">{serverSubscription.remainingDays}</p>
              </div>
            </div>
          )}
          {serverError && <p className="mt-2 text-xs font-semibold text-brand">{serverError}</p>}
          {serverSubscription && serverSubscription.status === "ACTIVE" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={serverBusy}
                onClick={() => void toggleAutoRenew()}
                className="rounded-lg border border-border px-3 py-2 text-xs font-bold disabled:opacity-50"
              >
                Auto-renew: {serverSubscription.autoRenew ? "On" : "Off"}
              </button>
              <button
                type="button"
                disabled={serverBusy}
                onClick={() => void endSubscription()}
                className="rounded-lg border border-brand/30 px-3 py-2 text-xs font-bold text-brand disabled:opacity-50"
              >
                Cancel renewal
              </button>
            </div>
          )}
          {tier && state.installmentsPaid === 1 && (
            <button
              onClick={() =>
                setPending({
                  id: tier.id,
                  amount: tier.installment,
                  title: `${tier.name} — ${t("secondInstallment")}`,
                  second: true,
                })
              }
              className="mt-3 w-full py-2 rounded-lg bg-brand text-brand-foreground text-sm font-semibold"
            >
              {t("secondInstallment")} · ₦{tier.installment.toLocaleString()}
            </button>
          )}
          {!tier && freeLeft === 0 && (
            <p className="mt-2 text-xs text-brand font-semibold">{t("quotaFinished")}</p>
          )}
        </div>

        <h2 className="font-bold px-1">{t("choosePlan")}</h2>

        <div className="space-y-3">
          {TIERS.map((p) => {
            const active = state.tier === p.id;
            return (
              <div
                key={p.id}
                className={`rounded-2xl border overflow-hidden ${active ? "border-brand" : "border-border"} bg-card`}
              >
                <div className={`h-1 ${p.accent}`} />
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold flex items-center gap-1.5">
                        {p.listings === -1 && <Crown className="h-4 w-4 text-brand" />}
                        {p.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        {p.listings === -1 ? (
                          <>
                            <InfinityIcon className="h-3 w-3" /> {t("unlimitedListings")}
                          </>
                        ) : (
                          `${p.listings} ${t("listingsPerMonth")}`
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-brand">₦{p.monthly.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">{t("perMonth")}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-lg bg-accent/40 py-1.5">
                      <p className="text-[10px] text-muted-foreground">{t("firstInstallment")}</p>
                      <p className="text-sm font-bold">₦{p.installment.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-accent/40 py-1.5">
                      <p className="text-[10px] text-muted-foreground">{t("secondInstallment")}</p>
                      <p className="text-sm font-bold">₦{p.installment.toLocaleString()}</p>
                    </div>
                  </div>

                  <button
                    disabled={active}
                    onClick={() =>
                      setPending({
                        id: p.id,
                        amount: p.installment,
                        title: `${p.name} — ${t("firstInstallment")}`,
                      })
                    }
                    className={`mt-3 w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${
                      active ? "bg-accent text-muted-foreground" : "bg-brand text-brand-foreground"
                    }`}
                  >
                    {active ? (
                      <>
                        <Check className="h-4 w-4" /> {t("currentPlan")}
                      </>
                    ) : (
                      `${t("payFirstInstallment")} · ₦${p.installment.toLocaleString()}`
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <PayModal
        open={!!pending}
        onClose={() => setPending(null)}
        title={pending?.title ?? ""}
        amountNaira={pending?.amount ?? 0}
        purpose={{ kind: "subscription", tierId: pending?.id ?? "basic" }}
        onPaid={() => {
          if (!pending) return;
          if (pending.second) paySecondInstallment();
          else activateTier(pending.id);
          setPending(null);
          void loadServerSubscription();
        }}
      />
    </AppShell>
  );
}
