import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { jobs, PRICING } from "@/lib/mock-data";
import { Plus, MapPin, Building2, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { PayModal } from "@/components/PayModal";
import type { PaymentPurpose } from "@/lib/paystack";

export const Route = createFileRoute("/jobs")({ component: JobsPage });

function JobsPage() {
  const { t } = useI18n();
  const [promoFor, setPromoFor] = useState<string | null>(null);
  const [pay, setPay] = useState<{ title: string; amount: number; purpose: PaymentPurpose } | null>(
    null,
  );

  return (
    <AppShell title={t("jobs")}>
      <div className="space-y-4">
        <button className="w-full py-2.5 rounded-xl bg-brand text-brand-foreground font-semibold flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" /> {t("addJob")} · Kyauta
        </button>
        <p className="text-[11px] text-muted-foreground text-center">
          Posting kyauta. Boost: ₦{PRICING.jobPromoMin.toLocaleString()}–₦
          {PRICING.jobPromoMax.toLocaleString()}
        </p>
        <div className="space-y-3">
          {jobs.map((j) => (
            <div key={j.id} className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-1.5">
                    {j.title}
                    {j.promoted && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand text-brand-foreground font-bold">
                        PROMO
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {j.company}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {j.location}
                    </span>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-brand/10 text-brand font-medium">
                  {j.type}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-bold text-brand">{j.salary}</span>
                <div className="flex items-center gap-2">
                  {!j.promoted && (
                    <button
                      onClick={() => setPromoFor(j.id)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-brand text-brand font-semibold flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" /> Boost
                    </button>
                  )}
                  <button className="text-xs px-3 py-1.5 rounded-lg bg-foreground text-background font-semibold">
                    Apply
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {promoFor && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
          onClick={() => setPromoFor(null)}
        >
          <div
            className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-bold">Boost Job</h3>
              <button onClick={() => setPromoFor(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              {[
                { amt: PRICING.jobPromoMin, label: "Basic boost", sub: "7 kwanaki" },
                { amt: PRICING.jobPromoMax, label: "Premium boost", sub: "14 kwanaki + spotlight" },
              ].map((tier) => (
                <button
                  key={tier.amt}
                  onClick={() => {
                    setPay({
                      title: tier.label,
                      amount: tier.amt,
                      purpose: { kind: "job_promo", jobId: promoFor },
                    });
                    setPromoFor(null);
                  }}
                  className="w-full p-3 rounded-xl border border-border flex items-center justify-between hover:border-brand"
                >
                  <div className="text-left">
                    <p className="font-semibold text-sm">{tier.label}</p>
                    <p className="text-xs text-muted-foreground">{tier.sub}</p>
                  </div>
                  <span className="font-bold text-brand">₦{tier.amt.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <PayModal
        open={!!pay}
        onClose={() => setPay(null)}
        title={pay?.title ?? ""}
        amountNaira={pay?.amount ?? 0}
        purpose={pay?.purpose ?? { kind: "job_promo", jobId: "" }}
      />
    </AppShell>
  );
}
