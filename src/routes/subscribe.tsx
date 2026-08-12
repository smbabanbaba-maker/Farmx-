import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useSubscription, TIERS, FREE_QUOTA, type TierId } from "@/lib/subscription";
import { PayModal } from "@/components/PayModal";
import { Check, Crown, Infinity as InfinityIcon } from "lucide-react";
import { useState } from "react";

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

  return (
    <AppShell title={t("subscription")}>
      <div className="space-y-4 pb-6">
        <div className="rounded-2xl p-4 bg-card border border-border">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("currentPlan")}
          </p>
          <p className="text-lg font-bold mt-0.5">
            {tier ? tier.name : `${t("freeQuota")} (${FREE_QUOTA})`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {listingsLeft === "unlimited"
              ? t("unlimitedListings")
              : `${listingsLeft} ${t("quotaLeft")}`}
          </p>
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
        }}
      />
    </AppShell>
  );
}
