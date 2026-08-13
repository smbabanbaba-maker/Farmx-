import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useMyAds } from "@/lib/use-my-ads";
import {
  getTransactions,
  getWalletServices,
  getWalletSummary,
  initiateServicePayment,
  verifyServicePayment,
  type FarmXTransaction,
  type WalletService,
  type WalletServicePackage,
  type WalletSummary,
} from "@/lib/wallet.functions";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  EyeOff,
  Flame,
  Landmark,
  Loader2,
  Pin,
  ReceiptText,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  X,
} from "lucide-react";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "FarmX Services Wallet" },
      { name: "description", content: "Secure payments for official FarmX marketplace services." },
    ],
  }),
  component: WalletPage,
});

type Step = "home" | "review" | "payment" | "success";
type PaymentMethod = "card" | "bank_transfer" | "ussd" | "promotional_credits";
const icons = {
  boost: Rocket,
  featured: Star,
  top_placement: Pin,
  highlight: Flame,
  business_promotion: BriefcaseBusiness,
} as const;
const methodLabels: Record<PaymentMethod, string> = {
  card: "Card / ATM",
  bank_transfer: "Bank transfer",
  ussd: "USSD",
  promotional_credits: "Promotional credits",
};
function money(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(value);
}
function date(value: string) {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function WalletPage() {
  const { t } = useI18n();
  const ads = useMyAds(true);
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [services, setServices] = useState<WalletService[]>([]);
  const [transactions, setTransactions] = useState<FarmXTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [step, setStep] = useState<Step>("home");
  const [serviceId, setServiceId] = useState<WalletService["id"] | null>(null);
  const [listingId, setListingId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [reference, setReference] = useState<string>();
  const [checkoutUrl, setCheckoutUrl] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [transaction, setTransaction] = useState<FarmXTransaction>();
  const service = services.find((item) => item.id === serviceId);
  const selectedPackage = service?.packages.find((item) => item.id === packageId);
  const eligibleAds = useMemo(
    () => ads.ads.filter((ad) => ["ACTIVE", "PUBLISHED", "published"].includes(ad.status)),
    [ads.ads],
  );

  const refresh = async () => {
    setLoading(true);
    try {
      const [nextSummary, nextServices, nextTransactions] = await Promise.all([
        getWalletSummary(),
        getWalletServices(),
        getTransactions(),
      ]);
      setSummary(nextSummary);
      setServices(nextServices);
      setTransactions(nextTransactions);
      setError(undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Wallet data could not be loaded.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
  }, []);

  const reset = () => {
    setStep("home");
    setServiceId(null);
    setListingId("");
    setPackageId("");
    setReference(undefined);
    setCheckoutUrl(undefined);
    setError(undefined);
  };
  const chooseService = (item: WalletService) => {
    setServiceId(item.id);
    setPackageId(item.packages[0]?.id ?? "");
    setListingId(item.requiresListing ? (eligibleAds[0]?.listingId ?? "") : "");
    setMethod("card");
    setError(undefined);
    setStep("review");
  };
  const startPayment = async () => {
    if (!service || !selectedPackage) return;
    if (service.requiresListing && !listingId) {
      setError("Select one of your active listings before continuing.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const result = await initiateServicePayment({
        data: {
          serviceType: service.id,
          packageId: selectedPackage.id,
          listingId: listingId || undefined,
          paymentMethod: method,
        },
      });
      setReference(result.reference);
      setCheckoutUrl(result.checkoutUrl);
      setStep("payment");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Payment could not be started.");
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    if (!reference) return;
    setBusy(true);
    setError(undefined);
    try {
      await verifyServicePayment({ data: { reference } });
      setStep("success");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Payment is not verified yet.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title={t("wallet")}>
      <div className="space-y-5 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {error && (
          <div
            className="flex items-start gap-2 rounded-2xl border border-brand/20 bg-brand/5 p-3 text-xs font-semibold text-brand"
            role="alert"
          >
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
            <button
              className="ml-auto min-h-8 min-w-8 rounded-lg"
              onClick={() => setError(undefined)}
              aria-label="Dismiss wallet message"
            >
              <X className="mx-auto h-4 w-4" />
            </button>
          </div>
        )}
        {step === "home" && (
          <>
            <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-brand p-5 text-white shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                    FarmX Services
                  </p>
                  <h1 className="mt-2 text-2xl font-black">Wallet</h1>
                </div>
                <button
                  className="min-h-11 min-w-11 rounded-xl bg-white/10 p-3"
                  onClick={() => setHidden((value) => !value)}
                  aria-label="Toggle balance visibility"
                >
                  {hidden ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </button>
              </div>
              <p className="mt-8 text-xs font-semibold text-white/70">Available FarmX Balance</p>
              <p className="mt-1 text-3xl font-black">
                {hidden ? "••••••" : money(summary?.cashBalance ?? 0)}
              </p>
              <p className="mt-2 max-w-sm text-[11px] leading-5 text-white/65">
                This wallet is only for official FarmX services, not buyer-to-seller product
                payments.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  className="min-h-11 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-slate-950"
                  onClick={() => {
                    setNotice(
                      "FarmX uses direct service payments instead of stored buyer-to-seller funds.",
                    );
                    document
                      .getElementById("farmx-services")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Add funds
                </button>
                <button
                  className="min-h-11 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-black"
                  onClick={() =>
                    document.getElementById("transactions")?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Transaction history
                </button>
              </div>
            </section>
            <div className="grid grid-cols-3 gap-2">
              <Balance
                label="Cash balance"
                value={summary?.cashBalance ?? 0}
                hidden={hidden}
                icon={<CreditCard className="h-4 w-4" />}
              />
              <Balance
                label="Promotional credits"
                value={summary?.promotionalCredits ?? 0}
                hidden={hidden}
                icon={<Sparkles className="h-4 w-4" />}
              />
              <Balance
                label="Pending"
                value={summary?.pendingAmount ?? 0}
                hidden={hidden}
                icon={<Clock3 className="h-4 w-4" />}
              />
            </div>
            {notice && (
              <p className="rounded-xl bg-brand/5 px-3 py-2 text-xs font-semibold text-brand">
                {notice}
              </p>
            )}
            <section id="farmx-services" className="scroll-mt-24">
              <div className="mb-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">
                  Official services
                </p>
                <h2 className="mt-1 text-lg font-black">FarmX Services</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Visibility tools configured by FarmX.
                </p>
              </div>
              {loading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[1, 2].map((item) => (
                    <div key={item} className="h-36 animate-pulse rounded-2xl bg-muted" />
                  ))}
                </div>
              ) : services.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                  <p className="text-sm font-black">No FarmX services are currently configured.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Services will appear here when enabled by FarmX.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {services.map((item) => {
                    const Icon = icons[item.id];
                    return (
                      <button
                        key={item.id}
                        className="min-h-36 rounded-2xl border border-border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
                        onClick={() => chooseService(item)}
                      >
                        <div className="flex items-start justify-between">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                            <Icon className="h-5 w-5" />
                          </span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <h3 className="mt-4 text-sm font-black">{item.label}</h3>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {item.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
            <section className="rounded-2xl border border-brand/15 bg-brand/[0.04] p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <p className="text-[11px] leading-5 text-muted-foreground">
                  <strong className="text-foreground">Secure payment:</strong> FarmX never stores
                  CVV, PIN, OTP, raw card numbers, or bank login details. Payment status is verified
                  server-side.
                </p>
              </div>
            </section>
            <History items={transactions} onSelect={setTransaction} />
          </>
        )}
        {step === "review" && service && selectedPackage && (
          <Review
            service={service}
            packageInfo={selectedPackage}
            ads={eligibleAds}
            listingId={listingId}
            setListingId={setListingId}
            packageId={packageId}
            setPackageId={setPackageId}
            method={method}
            setMethod={setMethod}
            credits={summary?.promotionalCredits ?? 0}
            onBack={reset}
            onPay={() => void startPayment()}
            busy={busy}
          />
        )}
        {step === "payment" && (
          <Payment
            reference={reference}
            checkoutUrl={checkoutUrl}
            onBack={() => setStep("review")}
            onVerify={() => void verify()}
            busy={busy}
          />
        )}
        {step === "success" && <Success service={service} reference={reference} onDone={reset} />}
      </div>
      {transaction && (
        <Transaction transaction={transaction} onClose={() => setTransaction(undefined)} />
      )}
    </AppShell>
  );
}

function Balance({
  label,
  value,
  hidden,
  icon,
}: {
  label: string;
  value: number;
  hidden: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-bold leading-4">{label}</span>
      </div>
      <p className="mt-2 text-sm font-black">{hidden ? "••••" : money(value)}</p>
    </div>
  );
}

function Review({
  service,
  packageInfo,
  ads,
  listingId,
  setListingId,
  packageId,
  setPackageId,
  method,
  setMethod,
  credits,
  onBack,
  onPay,
  busy,
}: {
  service: WalletService;
  packageInfo: WalletServicePackage;
  ads: ReturnType<typeof useMyAds>["ads"];
  listingId: string;
  setListingId: (value: string) => void;
  packageId: string;
  setPackageId: (value: string) => void;
  method: PaymentMethod;
  setMethod: (value: PaymentMethod) => void;
  credits: number;
  onBack: () => void;
  onPay: () => void;
  busy: boolean;
}) {
  const listing = ads.find((item) => item.listingId === listingId);
  return (
    <section className="space-y-4">
      <button
        className="inline-flex min-h-11 items-center gap-2 px-2 text-xs font-black text-muted-foreground"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" /> Wallet
      </button>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">
          Payment review
        </p>
        <h1 className="mt-1 text-2xl font-black">{service.label}</h1>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {service.note ?? service.description}
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        {service.requiresListing && (
          <label className="block">
            <span className="text-xs font-black">Select an active listing</span>
            <select
              value={listingId}
              onChange={(event) => setListingId(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-brand"
            >
              <option value="">Choose listing</option>
              {ads.map((item) => (
                <option key={item.listingId} value={item.listingId}>
                  {item.title} · {item.region}
                </option>
              ))}
            </select>
            {ads.length === 0 && (
              <span className="mt-2 block text-[11px] text-muted-foreground">
                You need an active listing before using this service.
              </span>
            )}
          </label>
        )}
        {listing && (
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-brand/5 p-3">
            <ShoppingBag className="h-4 w-4 text-brand" />
            <div>
              <p className="text-xs font-black">{listing.title}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {listing.region} · {money(listing.price)}
              </p>
            </div>
          </div>
        )}
        <div className="mt-5">
          <span className="text-xs font-black">Choose duration</span>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {service.packages.map((item) => (
              <button
                key={item.id}
                onClick={() => setPackageId(item.id)}
                className={`min-h-16 rounded-xl border p-3 text-left ${item.id === packageId ? "border-brand bg-brand/5" : "border-border hover:border-brand"}`}
              >
                <span className="block text-xs font-black">{item.durationDays} days</span>
                <span className="mt-1 block text-[11px] font-bold text-brand">
                  {money(item.amount)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <PaymentMethods
        value={method}
        onChange={setMethod}
        credits={credits}
        total={packageInfo.amount}
      />
      <div className="rounded-2xl border border-border bg-card p-4">
        <Row label="Service" value={service.label} />
        <Row label="Duration" value={`${packageInfo.durationDays} days`} />
        <div className="mt-3 flex justify-between border-t border-border pt-3 text-base">
          <span className="font-black">Total</span>
          <span className="font-black text-brand">{money(packageInfo.amount)}</span>
        </div>
      </div>
      <button
        disabled={busy || (service.requiresListing && !listingId)}
        onClick={onPay}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-black text-brand-foreground disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Continue to payment <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </section>
  );
}

function PaymentMethods({
  value,
  onChange,
  credits,
  total,
}: {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  credits: number;
  total: number;
}) {
  const methods: { id: PaymentMethod; icon: React.ReactNode; disabled?: boolean }[] = [
    { id: "card", icon: <CreditCard className="h-4 w-4" /> },
    { id: "bank_transfer", icon: <Landmark className="h-4 w-4" /> },
    { id: "ussd", icon: <ArrowRight className="h-4 w-4" /> },
    {
      id: "promotional_credits",
      icon: <Sparkles className="h-4 w-4" />,
      disabled: credits < total,
    },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <span className="text-xs font-black">Payment method</span>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {methods.map((item) => (
          <button
            key={item.id}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 text-left text-[11px] font-bold disabled:opacity-40 ${value === item.id ? "border-brand bg-brand/5 text-brand" : "border-border hover:border-brand"}`}
          >
            {item.icon}
            {methodLabels[item.id]}
          </button>
        ))}
      </div>
      {value === "promotional_credits" && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Available credits: {money(credits)}. Credits cannot be withdrawn as cash.
        </p>
      )}
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-bold">{value}</span>
    </div>
  );
}

function Payment({
  reference,
  checkoutUrl,
  onBack,
  onVerify,
  busy,
}: {
  reference?: string;
  checkoutUrl?: string;
  onBack: () => void;
  onVerify: () => void;
  busy: boolean;
}) {
  return (
    <section className="space-y-5">
      <button
        className="inline-flex min-h-11 items-center gap-2 px-2 text-xs font-black text-muted-foreground"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" /> Review
      </button>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">
          Secure payment
        </p>
        <h1 className="mt-1 text-2xl font-black">Complete payment</h1>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Complete checkout with the provider, then return here for server-side verification.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-brand" />
          <div>
            <p className="text-xs font-black">Reference {reference}</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              FarmX will not activate the service until payment is verified.
            </p>
          </div>
        </div>
        {checkoutUrl && !checkoutUrl.startsWith("#") && (
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-brand px-4 py-3 text-sm font-black text-brand-foreground"
          >
            Open secure payment
          </a>
        )}
        {checkoutUrl?.startsWith("#") && (
          <p className="mt-4 rounded-xl bg-brand/5 p-3 text-xs font-semibold text-brand">
            Preview mode: no payment provider is connected.
          </p>
        )}
      </div>
      <button
        disabled={busy}
        onClick={onVerify}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-brand px-4 py-3 text-sm font-black text-brand disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Verify payment <CheckCircle2 className="h-4 w-4" />
          </>
        )}
      </button>
    </section>
  );
}
function Success({
  service,
  reference,
  onDone,
}: {
  service?: WalletService;
  reference?: string;
  onDone: () => void;
}) {
  return (
    <section className="space-y-5 py-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-700">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-green-700">
          Payment successful
        </p>
        <h1 className="mt-2 text-2xl font-black">{service?.label ?? "FarmX service"} activated</h1>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
          Your FarmX service has been activated after payment verification. It increases visibility;
          it does not guarantee sales.
        </p>
        {reference && <p className="mt-3 text-xs font-black">Reference: {reference}</p>}
      </div>
      <button
        onClick={onDone}
        className="min-h-12 w-full rounded-xl bg-brand px-4 py-3 text-sm font-black text-brand-foreground"
      >
        Back to Wallet
      </button>
    </section>
  );
}

function History({
  items,
  onSelect,
}: {
  items: FarmXTransaction[];
  onSelect: (item: FarmXTransaction) => void;
}) {
  return (
    <section id="transactions" className="scroll-mt-24">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">
            Account activity
          </p>
          <h2 className="mt-1 text-lg font-black">Transaction History</h2>
        </div>
        <ReceiptText className="h-5 w-5 text-brand" />
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="text-sm font-black">No FarmX service transactions yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Verified service payments will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 text-left hover:border-brand"
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-black">{item.serviceLabel}</span>
                <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                  {item.listingTitle ?? "FarmX account service"} · {date(item.createdAt)}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-xs font-black">{money(item.amount)}</span>
                <span
                  className={`mt-1 block text-[10px] font-bold capitalize ${item.status === "successful" ? "text-green-700" : "text-brand"}`}
                >
                  {item.status}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function Transaction({
  transaction,
  onClose,
}: {
  transaction: FarmXTransaction;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center">
      <article className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">
              FarmX receipt
            </p>
            <h2 className="mt-1 text-lg font-black">Transaction details</h2>
          </div>
          <button
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-xl p-3"
            aria-label="Close receipt"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <dl className="mt-5 space-y-2">
          <Row label="Service" value={transaction.serviceLabel} />
          <Row label="Listing" value={transaction.listingTitle ?? "FarmX account service"} />
          <Row label="Amount" value={money(transaction.amount)} />
          <Row label="Reference" value={transaction.reference} />
          <Row
            label="Payment method"
            value={
              methodLabels[transaction.paymentMethod as PaymentMethod] ?? transaction.paymentMethod
            }
          />
          <Row label="Date" value={date(transaction.createdAt)} />
          <Row label="Status" value={transaction.status} />
        </dl>
        <button
          onClick={() => window.print()}
          className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand px-4 py-2.5 text-xs font-black text-brand"
        >
          <ReceiptText className="h-4 w-4" /> View / print receipt
        </button>
      </article>
    </div>
  );
}

export default WalletPage;
