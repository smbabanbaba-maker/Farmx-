import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Crown, X, CreditCard, Building, Zap, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-repository";
import type { UserSubscription, SubscriptionPlan } from "@/lib/subscription.types";
import {
  cancelSubscription,
  getSubscriptionSummary,
  initiateSubscriptionPayment,
  setSubscriptionAutoRenew,
  verifySubscriptionPayment,
} from "@/lib/subscription.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/plans")({ component: PlansPage });

type PaymentMethod = "card" | "bank_transfer" | "wallet";

type CheckoutStep = "review" | "payment" | "success";

function PlansPage() {
  const [sub, setSub] = useState<UserSubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("review");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [paymentReference, setPaymentReference] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState<string | undefined>();
  const [processing, setProcessing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const currentSub = await getSubscriptionSummary();
        if (!cancelled) setSub(currentSub);
      } catch {
        toast.error("Subscription status could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentPlan =
    SUBSCRIPTION_PLANS.find((plan) => plan.tier === (sub?.tier ?? "FREE")) ?? SUBSCRIPTION_PLANS[0];

  const openCheckout = (plan: SubscriptionPlan) => {
    if (plan.price <= 0) return;
    setSelectedPlan(plan);
    setCheckoutStep("review");
    setPaymentReference("");
    setCheckoutUrl(undefined);
  };

  const handleToggleAutoRenew = async () => {
    if (!sub) return;
    try {
      const updated = await setSubscriptionAutoRenew({ data: { enabled: !sub.autoRenew } });
      setSub(updated);
      toast.success(updated.autoRenew ? "Auto-renew enabled successfully" : "Auto-renew disabled");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Subscription settings could not be updated.",
      );
    }
  };

  const handleStartPayment = async () => {
    if (!selectedPlan || selectedPlan.tier === "FREE") return;
    setProcessing(true);
    try {
      const result = await initiateSubscriptionPayment({
        data: { tier: selectedPlan.tier, paymentMethod },
      });
      setPaymentReference(result.reference);
      setCheckoutUrl(result.checkoutUrl);
      if (result.status === "successful") {
        setSub(await getSubscriptionSummary());
        setCheckoutStep("success");
        toast.success("Subscription activated successfully.");
      } else {
        setCheckoutStep("payment");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment could not be started.");
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!paymentReference) return;
    setProcessing(true);
    try {
      await verifySubscriptionPayment({ data: { reference: paymentReference } });
      setSub(await getSubscriptionSummary());
      setCheckoutStep("success");
      toast.success("Payment verified and subscription activated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment is not verified yet.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setSub(await cancelSubscription());
      setShowCancelConfirm(false);
      toast.success("Subscription cancelled. Existing benefits remain until renewal.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Subscription could not be cancelled.");
    }
  };

  return (
    <AppShell title="FarmX Plans">
      <div className="space-y-6 pb-20">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand to-foreground p-6 text-brand-foreground shadow-lg sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
            <Crown className="h-3.5 w-3.5 text-yellow-300" /> FarmX Membership
          </span>
          <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
            Choose the plan that fits your farming or business needs.
          </h1>
          <p className="mt-2 text-xs text-white/80">
            Unlock higher listing limits, promotion credits, and analytics based on your verified
            subscription.
          </p>
        </section>

        {!loading && sub && (
          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Current Plan
                </p>
                <h2 className="mt-1 flex items-center gap-2 text-xl font-black text-brand">
                  {currentPlan.name}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${sub.status === "ACTIVE" ? "bg-green-500/10 text-green-700" : "bg-muted text-muted-foreground"}`}
                  >
                    {sub.status}
                  </span>
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground">Listing limit</p>
                <p className="text-xs font-black">
                  Up to {currentPlan.maxListings} active listings
                </p>
              </div>
            </div>

            {sub.tier !== "FREE" && (
              <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs sm:grid-cols-4">
                <Info label="Start Date" value={new Date(sub.startDate).toLocaleDateString()} />
                <Info label="Renewal Date" value={new Date(sub.renewalDate).toLocaleDateString()} />
                <Info label="Remaining Days" value={`${sub.remainingDays} days`} accent />
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Auto-renew</p>
                    <p className="font-bold">{sub.autoRenew ? "ON" : "OFF"}</p>
                  </div>
                  <button
                    onClick={handleToggleAutoRenew}
                    className="rounded-lg bg-brand/10 px-3 py-1.5 text-[10px] font-bold text-brand hover:bg-brand/20"
                  >
                    Toggle
                  </button>
                </div>
              </div>
            )}

            {sub.overLimit && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
                <p className="font-black">Your current plan limit has been exceeded.</p>
                <p className="mt-1">
                  You have {sub.activeListings ?? "some"} active listings, while this plan allows{" "}
                  {sub.listingLimit ?? "fewer"}. Existing listings are preserved; publishing new
                  listings is paused until you upgrade or reduce active listings.
                </p>
              </div>
            )}

            {sub.tier !== "FREE" && (sub.status === "ACTIVE" || sub.status === "PENDING") && (
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="rounded-xl border border-destructive/30 px-4 py-2 text-xs font-bold text-destructive hover:bg-destructive/5"
                >
                  Cancel subscription
                </button>
                <p className="text-[10px] text-muted-foreground">
                  Cancellation stops future renewal; it does not delete listings or account data.
                </p>
              </div>
            )}
          </section>
        )}

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black">Available Subscription Tiers</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Monthly plans with clear limits and benefits.
              </p>
            </div>
            <button
              onClick={() => setShowComparison((value) => !value)}
              className="rounded-xl border border-brand px-3 py-2 text-[10px] font-black text-brand"
            >
              {showComparison ? "Hide comparison" : "Compare all plans"}
            </button>
          </div>

          <div className="flex snap-x gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isCurrent =
                sub?.tier === plan.tier && (sub.status === "ACTIVE" || sub.status === "PENDING");
              return (
                <article
                  key={plan.tier}
                  className={`relative flex min-w-[285px] snap-start flex-col justify-between rounded-3xl border bg-card p-6 transition sm:min-w-0 ${plan.badge ? "border-brand shadow-md" : "border-border hover:border-brand/40"}`}
                >
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
                      <span className="text-3xl font-black">
                        {plan.currency}
                        {plan.price.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">/ month</span>
                    </div>
                    <ul className="space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
                      <li className="font-bold text-foreground">
                        ✓ Up to {plan.maxListings} active listings
                      </li>
                      <li className="font-bold text-foreground">
                        ✓ {plan.topCredits} TOP promotion credits/month
                      </li>
                      {plan.features.slice(2, 7).map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-6 border-t border-border pt-4">
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full min-h-11 rounded-2xl bg-muted text-xs font-black text-muted-foreground"
                      >
                        Current Plan
                      </button>
                    ) : plan.price === 0 ? (
                      <button
                        disabled
                        className="w-full min-h-11 rounded-2xl bg-muted text-xs font-black text-muted-foreground"
                      >
                        Free Plan
                      </button>
                    ) : (
                      <button
                        onClick={() => openCheckout(plan)}
                        className="w-full min-h-11 rounded-2xl bg-brand text-xs font-black text-brand-foreground shadow-md shadow-brand/20 hover:bg-brand/90"
                      >
                        {sub?.tier !== "FREE"
                          ? "Upgrade / Change Plan"
                          : `Subscribe — ₦${plan.price.toLocaleString()}/month`}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {showComparison && <PlanComparison />}
      </div>

      {selectedPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !processing && setSelectedPlan(null)}
        >
          <div
            className="w-full max-w-lg space-y-6 rounded-3xl border border-border bg-card p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-base font-black">Subscription Checkout</h3>
              <button
                disabled={processing}
                onClick={() => setSelectedPlan(null)}
                className="rounded-full p-2 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {checkoutStep === "review" && (
              <div className="space-y-5 text-xs">
                <div className="space-y-3 rounded-2xl bg-muted/50 p-4">
                  <div className="flex justify-between text-sm font-black">
                    <span>{selectedPlan.name} Plan</span>
                    <span className="text-brand">
                      ₦{selectedPlan.price.toLocaleString()} / month
                    </span>
                  </div>
                  <p className="text-muted-foreground">{selectedPlan.description}</p>
                  <div className="space-y-1 border-t border-border pt-3 font-bold">
                    <p>• Up to {selectedPlan.maxListings} active listings</p>
                    <p>• {selectedPlan.topCredits} TOP promotion credits included</p>
                    <p>• Renewal date is calculated after verified activation</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="font-black">Select payment method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: "card", label: "Bank Card", icon: CreditCard },
                        { id: "bank_transfer", label: "Bank Transfer", icon: Building },
                        { id: "wallet", label: "FarmX Wallet", icon: Zap },
                      ] as const
                    ).map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border p-3 font-bold transition ${paymentMethod === method.id ? "border-brand bg-brand/10 text-brand" : "border-border text-muted-foreground"}`}
                      >
                        <method.icon className="h-5 w-5" />
                        <span className="text-[10px]">{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  disabled={processing}
                  onClick={handleStartPayment}
                  className="w-full min-h-12 rounded-2xl bg-brand text-xs font-black text-brand-foreground shadow-lg shadow-brand/20"
                >
                  {processing
                    ? "Starting secure payment..."
                    : `Proceed to payment — ₦${selectedPlan.price.toLocaleString()}`}
                </button>
                <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand" /> Subscription activates only
                  after server verification.
                </p>
              </div>
            )}

            {checkoutStep === "payment" && (
              <div className="space-y-5 py-5 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand">
                  <Zap className="h-8 w-8" />
                </div>
                <h4 className="text-sm font-black">Complete secure payment</h4>
                <p className="text-xs text-muted-foreground">
                  Reference: <span className="font-bold text-foreground">{paymentReference}</span>
                </p>
                {checkoutUrl && (
                  <a
                    href={checkoutUrl}
                    className="block w-full rounded-2xl border border-brand px-4 py-3 text-xs font-black text-brand hover:bg-brand/5"
                  >
                    Open Paystack checkout
                  </a>
                )}
                <p className="text-[10px] text-muted-foreground">
                  After payment, return here and verify the transaction. FarmX will not activate the
                  plan from the browser alone.
                </p>
                <button
                  disabled={processing}
                  onClick={handleVerifyPayment}
                  className="w-full min-h-12 rounded-2xl bg-brand text-xs font-black text-brand-foreground"
                >
                  {processing ? "Verifying with provider..." : "Verify payment"}
                </button>
              </div>
            )}

            {checkoutStep === "success" && (
              <div className="space-y-5 py-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="text-base font-black text-green-800">Subscription Activated</h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your {selectedPlan.name} plan is active after verified payment.
                  </p>
                </div>
                <div className="space-y-1 rounded-2xl bg-muted/50 p-4 text-left text-xs">
                  <p>
                    <strong>Plan:</strong> {selectedPlan.name}
                  </p>
                  <p>
                    <strong>Amount:</strong> ₦{selectedPlan.price.toLocaleString()}
                  </p>
                  <p>
                    <strong>Transaction reference:</strong> {paymentReference}
                  </p>
                  <p>
                    <strong>Renewal date:</strong>{" "}
                    {sub
                      ? new Date(sub.renewalDate).toLocaleDateString()
                      : "Available in your plan summary"}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="w-full min-h-12 rounded-2xl bg-brand text-xs font-black text-brand-foreground"
                >
                  Return to FarmX
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowCancelConfirm(false)}
        >
          <div
            className="w-full max-w-md space-y-5 rounded-3xl border border-border bg-card p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-base font-black">Cancel subscription?</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Your existing data and listings will remain. Premium access will end according to the
              current subscription period, and no future renewal will be started.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="min-h-11 flex-1 rounded-xl border border-border text-xs font-black"
              >
                Keep plan
              </button>
              <button
                onClick={() => void handleCancelSubscription()}
                className="min-h-11 flex-1 rounded-xl bg-destructive text-xs font-black text-destructive-foreground"
              >
                Confirm cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Info({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`font-bold ${accent ? "text-brand" : ""}`}>{value}</p>
    </div>
  );
}

function PlanComparison() {
  const rows = [
    ["Active listings", (plan: SubscriptionPlan) => String(plan.maxListings)],
    ["TOP credits / month", (plan: SubscriptionPlan) => String(plan.topCredits)],
    ["Monthly price", (plan: SubscriptionPlan) => `₦${plan.price.toLocaleString()}`],
    [
      "Advanced analytics",
      (plan: SubscriptionPlan) =>
        plan.tier === "PREMIUM" ||
        plan.tier === "VIP" ||
        plan.tier === "BUSINESS" ||
        plan.tier === "DIAMOND" ||
        plan.tier === "ENTERPRISE"
          ? "Included"
          : "Not included",
    ],
    [
      "Business profile",
      (plan: SubscriptionPlan) =>
        ["BUSINESS", "DIAMOND", "ENTERPRISE", "VIP", "PREMIUM"].includes(plan.tier)
          ? "Included"
          : "Not included",
    ],
  ] as const;
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="border-b border-border p-5">
        <h2 className="text-sm font-black">Compare all plans</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Review limits before choosing. Actual benefits are enforced by the server in production.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 font-black">Benefit</th>
              {SUBSCRIPTION_PLANS.map((plan) => (
                <th key={plan.tier} className="p-3 font-black text-brand">
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-t border-border">
                <td className="p-3 font-bold">{label}</td>
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <td key={plan.tier} className="p-3 text-muted-foreground">
                    {value(plan)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
