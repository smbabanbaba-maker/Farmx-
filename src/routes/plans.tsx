import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Crown,
  ShieldCheck,
  Zap,
  Calendar,
  Sparkles,
  ArrowRight,
  X,
  CreditCard,
  Building,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SUBSCRIPTION_PLANS, getSubscriptionRepository } from "@/lib/subscription-repository";
import type { UserSubscription, SubscriptionPlan } from "@/lib/subscription.types";
import { toast } from "sonner";

export const Route = createFileRoute("/plans")({
  component: PlansPage,
});

function PlansPage() {
  const [sub, setSub] = useState<UserSubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutStep, setCheckoutStep] = useState<"review" | "payment" | "success">("review");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer" | "wallet">("card");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const repo = await getSubscriptionRepository();
        const currentSub = await repo.getUserSubscription("preview-user");
        if (cancelled) return;
        setSub(currentSub);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleAutoRenew = async () => {
    const repo = await getSubscriptionRepository();
    const next = await repo.toggleAutoRenew("preview-user");
    setSub((prev) => (prev ? { ...prev, autoRenew: next } : null));
    toast.success(next ? "Auto-renew enabled successfully" : "Auto-renew disabled");
  };

  const handleProcessPayment = async () => {
    if (!selectedPlan) return;
    setProcessing(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      const repo = await getSubscriptionRepository();
      const updated = await repo.updateUserSubscription("preview-user", selectedPlan.tier, "ACTIVE", `TXN-${Date.now()}`);
      setSub(updated);
      setCheckoutStep("success");
      toast.success("Subscription activated successfully!");
    } catch {
      toast.error("Payment verification failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const currentPlanObj = SUBSCRIPTION_PLANS.find((p) => p.tier === (sub?.tier ?? "FREE")) || SUBSCRIPTION_PLANS[0];

  return (
    <AppShell title="FarmX Plans">
      <div className="space-y-6 pb-20">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand to-foreground p-6 text-brand-foreground shadow-lg sm:p-8">
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
              <Crown className="h-3.5 w-3.5 text-yellow-300" /> FarmX Membership
            </span>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Choose the plan that fits your farming or business needs.</h1>
            <p className="mt-2 text-xs text-white/80">Unlock higher listing limits, promotional credits, and advanced analytics.</p>
          </div>
        </section>

        {!loading && sub && (
          <div className="rounded-3xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Current Plan</p>
                <h2 className="text-xl font-black text-brand flex items-center gap-2">
                  {currentPlanObj.name} <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-[10px] font-bold text-green-700">{sub.status}</span>
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground">Active Listings</p>
                <p className="text-xs font-black">Up to {currentPlanObj.maxListings}</p>
              </div>
            </div>

            {sub.tier !== "FREE" && (
              <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs sm:grid-cols-4">
                <div>
                  <p className="text-[10px] text-muted-foreground">Start Date</p>
                  <p className="font-bold">{new Date(sub.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Renewal Date</p>
                  <p className="font-bold">{new Date(sub.renewalDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Remaining Days</p>
                  <p className="font-bold text-brand">{sub.remainingDays} days</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Auto-Renew</p>
                    <p className="font-bold">{sub.autoRenew ? "ON" : "OFF"}</p>
                  </div>
                  <button onClick={handleToggleAutoRenew} className="rounded-lg bg-brand/10 px-3 py-1 text-[10px] font-bold text-brand hover:bg-brand/20">
                    Toggle
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black">Available Subscription Tiers</h2>
            <span className="text-xs text-muted-foreground">Billed monthly</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isCurrent = sub?.tier === plan.tier;
              return (
                <div key={plan.tier} className={`relative rounded-3xl border bg-card p-6 flex flex-col justify-between transition ${plan.badge ? "border-brand shadow-md" : "border-border hover:border-brand/40"}`}>
                  {plan.badge && (
                    <span className="absolute -top-3 right-6 rounded-full bg-brand px-3 py-1 text-[9px] font-black text-brand-foreground shadow-sm">
                      {plan.badge}
                    </span>
                  )}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-black">{plan.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black">{plan.currency}{plan.price.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">/ month</span>
                    </div>

                    <ul className="space-y-2 text-xs text-muted-foreground border-t border-border pt-4">
                      <li className="font-bold text-foreground">✓ Up to {plan.maxListings} active listings</li>
                      <li className="font-bold text-foreground">✓ {plan.topCredits} TOP promotion credits/mo</li>
                      {plan.features.slice(2, 6).map((feat, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-brand shrink-0" /> {feat}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border">
                    {isCurrent ? (
                      <button disabled className="w-full min-h-11 rounded-2xl bg-muted text-muted-foreground font-black text-xs cursor-default">
                        Current Plan
                      </button>
                    ) : plan.price === 0 ? (
                      <button disabled className="w-full min-h-11 rounded-2xl bg-muted text-muted-foreground font-black text-xs">
                        Default Plan
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedPlan(plan);
                          setCheckoutStep("review");
                        }}
                        className="w-full min-h-11 rounded-2xl bg-brand text-brand-foreground font-black text-xs shadow-md shadow-brand/20 transition hover:bg-brand/90"
                      >
                        Subscribe — ₦{plan.price.toLocaleString()}/mo
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedPlan(null)}>
          <div className="w-full max-w-lg rounded-3xl bg-card border border-border p-6 shadow-xl space-y-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-base font-black">Subscription Checkout</h3>
              <button onClick={() => setSelectedPlan(null)} className="rounded-full p-2 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            {checkoutStep === "review" && (
              <div className="space-y-5 text-xs">
                <div className="rounded-2xl bg-muted/50 p-4 space-y-3">
                  <div className="flex justify-between font-black text-sm">
                    <span>{selectedPlan.name} Plan</span>
                    <span className="text-brand">₦{selectedPlan.price.toLocaleString()} / mo</span>
                  </div>
                  <p className="text-muted-foreground">{selectedPlan.description}</p>
                  <div className="border-t border-border pt-3 space-y-1 font-bold">
                    <p>• Up to {selectedPlan.maxListings} active listings</p>
                    <p>• {selectedPlan.topCredits} TOP promotion credits included</p>
                    <p>• Next renewal: {new Date(Date.now() + 30 * 86400000).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-black text-foreground">Select Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "card", label: "Bank Card", icon: CreditCard },
                      { id: "transfer", label: "Bank Transfer", icon: Building },
                      { id: "wallet", label: "FarmX Wallet", icon: Zap },
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={`flex flex-col items-center gap-1 rounded-2xl border p-3 font-bold transition ${paymentMethod === m.id ? "border-brand bg-brand/10 text-brand" : "border-border bg-card text-muted-foreground"}`}
                      >
                        <m.icon className="h-5 w-5" />
                        <span className="text-[10px]">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setCheckoutStep("payment")}
                  className="w-full min-h-12 rounded-2xl bg-brand text-brand-foreground font-black text-xs shadow-lg shadow-brand/20"
                >
                  Proceed to Payment (₦{selectedPlan.price.toLocaleString()})
                </button>
              </div>
            )}

            {checkoutStep === "payment" && (
              <div className="space-y-5 text-center py-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand animate-pulse">
                  <Zap className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black">Processing Secure Payment</h4>
                  <p className="text-xs text-muted-foreground">Connecting to FarmX payment infrastructure...</p>
                </div>
                <button
                  disabled={processing}
                  onClick={handleProcessPayment}
                  className="w-full min-h-12 rounded-2xl bg-brand text-brand-foreground font-black text-xs shadow-lg shadow-brand/20"
                >
                  {processing ? "Authorizing Payment..." : "Confirm & Pay ₦" + selectedPlan.price.toLocaleString()}
                </button>
              </div>
            )}

            {checkoutStep === "success" && (
              <div className="space-y-5 text-center py-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-black text-green-800">Subscription Activated!</h4>
                  <p className="text-xs text-muted-foreground">Your {selectedPlan.name} plan is now active.</p>
                </div>
                <div className="rounded-2xl bg-muted/50 p-4 text-left text-xs space-y-1">
                  <p><strong className="text-foreground">Plan:</strong> {selectedPlan.name}</p>
                  <p><strong className="text-foreground">Amount:</strong> ₦{selectedPlan.price.toLocaleString()}</p>
                  <p><strong className="text-foreground">Renewal Date:</strong> {new Date(Date.now() + 30 * 86400000).toLocaleDateString()}</p>
                  <p><strong className="text-foreground">Transaction Reference:</strong> TXN-{Date.now()}</p>
                </div>
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="w-full min-h-12 rounded-2xl bg-brand text-brand-foreground font-black text-xs"
                >
                  Return to FarmX
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
