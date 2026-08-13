import { Link } from "@tanstack/react-router";
import { getProfileRepository } from "@/lib/profile-repository";
import type { useProfileSnapshot } from "@/lib/use-profile-snapshot";
import {
  BarChart3,
  CheckCircle2,
  CreditCard,
  Heart,
  LineChart,
  Plus,
  Share2,
  UserMinus,
  UserPlus,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";

type SnapshotHook = ReturnType<typeof useProfileSnapshot>;
type SupportedSection = "promotions" | "analytics" | "balance" | "services" | "saved" | "network";

export function ProfileServicePanels({
  section,
  snapshot,
}: {
  section: SupportedSection;
  snapshot: SnapshotHook;
}) {
  if (snapshot.status === "loading")
    return <div className="h-56 animate-pulse rounded-2xl bg-muted" />;
  if (snapshot.status === "error" || !snapshot.data)
    return (
      <RetryPanel
        message={snapshot.error ?? "Unable to load Profile service data."}
        retry={snapshot.refresh}
      />
    );
  if (section === "promotions") return <PromotionsPanel snapshot={snapshot} />;
  if (section === "analytics") return <AnalyticsPanel snapshot={snapshot} />;
  if (section === "balance") return <BalancePanel snapshot={snapshot} />;
  if (section === "services") return <ServicesPanel snapshot={snapshot} />;
  if (section === "saved") return <SavedAdsPanel snapshot={snapshot} />;
  return <NetworkPanel snapshot={snapshot} />;
}

function PromotionsPanel({ snapshot }: { snapshot: SnapshotHook }) {
  const [creating, setCreating] = useState(false);
  const [adId, setAdId] = useState(snapshot.data!.ads[0]?.listingId ?? "");
  const [type, setType] = useState<"Boost" | "Featured">("Boost");
  const [days, setDays] = useState("7");
  const [notice, setNotice] = useState<string | null>(null);
  const campaigns = snapshot.data!.campaigns;
  const createCampaign = async () => {
    const ad = snapshot.data!.ads.find((entry) => entry.listingId === adId);
    if (!ad) return;
    try {
      const repository = await getProfileRepository();
      await repository.updatePreview((state) => {
        const budget = type === "Boost" ? 2799 : 5200;
        state.campaigns.unshift({
          id: `camp_${Date.now()}`,
          adTitle: ad.title,
          type,
          status: "scheduled",
          budget,
          spend: 0,
          durationDays: Number(days),
          startedAt: new Date().toISOString(),
          views: 0,
          clicks: 0,
          contacts: 0,
        });
        state.activity.unshift({
          id: `act_${Date.now()}`,
          type: "ad_boosted",
          title: `${type} scheduled`,
          detail: `${ad.title} has a preview ${type.toLowerCase()} campaign.`,
          occurredAt: new Date().toISOString(),
        });
      });
      await snapshot.refresh();
      setCreating(false);
      setNotice(
        "Campaign created in development preview. Payment will be connected through Paystack later.",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to create campaign.");
    }
  };
  return (
    <section className="space-y-3">
      {notice && <Notice text={notice} />}
      {creating ? (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <h2 className="font-bold">Create ad campaign</h2>
          <Select
            label="Advert"
            value={adId}
            onChange={setAdId}
            options={snapshot
              .data!.ads.filter((ad) => ad.status === "ACTIVE")
              .map((ad) => ({ value: ad.listingId, label: ad.title }))}
          />
          <Select
            label="Campaign type"
            value={type}
            onChange={(value) => setType(value as "Boost" | "Featured")}
            options={[
              { value: "Boost", label: "Boost ad — ₦2,799" },
              { value: "Featured", label: "Featured ad — ₦5,200" },
            ]}
          />
          <Select
            label="Duration"
            value={days}
            onChange={setDays}
            options={[
              { value: "7", label: "7 days" },
              { value: "14", label: "14 days" },
              { value: "30", label: "30 days" },
            ]}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setCreating(false)}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              onClick={() => void createCampaign()}
              className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-bold text-brand-foreground"
            >
              Create campaign
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-brand-foreground"
        >
          <Plus className="h-4 w-4" /> New campaign
        </button>
      )}
      {campaigns.map((campaign) => (
        <article key={campaign.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">{campaign.adTitle}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {campaign.type} · {campaign.durationDays} days · {campaign.status}
              </p>
            </div>
            <strong className="text-sm text-brand">
              ₦{campaign.spend.toLocaleString()} / ₦{campaign.budget.toLocaleString()}
            </strong>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Mini label="Views" value={campaign.views} />
            <Mini label="Clicks" value={campaign.clicks} />
            <Mini label="Contacts" value={campaign.contacts} />
          </div>
        </article>
      ))}
    </section>
  );
}

function AnalyticsPanel({ snapshot }: { snapshot: SnapshotHook }) {
  const [period, setPeriod] = useState("30 days");
  const data = snapshot.data!;
  const bars = useMemo(
    () => data.ads.slice(0, 5).map((ad) => ({ label: ad.title.slice(0, 10), value: ad.viewCount })),
    [data.ads],
  );
  const maximum = Math.max(...bars.map((bar) => bar.value), 1);
  return (
    <section className="space-y-3">
      <div className="flex gap-2 overflow-x-auto">
        {["Today", "7 days", "30 days", "90 days", "12 months"].map((item) => (
          <button
            key={item}
            onClick={() => setPeriod(item)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${period === item ? "border-brand bg-brand text-brand-foreground" : "border-border bg-card"}`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Mini label="Total views" value={data.stats.totalAdViews} />
        <Mini label="Saves" value={data.ads.reduce((sum, ad) => sum + ad.savedCount, 0)} />
        <Mini label="Chats" value={data.stats.buyerInquiries ?? 0} />
        <Mini label="Active ads" value={data.stats.activeAds} />
        <Mini
          label="Closed ads"
          value={data.ads.filter((ad) => ad.status === "CLOSED" || ad.status === "SOLD").length}
        />
        <Mini
          label="Followers gained"
          value={data.people.filter((person) => person.followsYou).length}
        />
      </div>
      <article className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">Ad views</h2>
            <p className="text-xs text-muted-foreground">{period} · Profile preview data</p>
          </div>
          <LineChart className="h-5 w-5 text-brand" />
        </div>
        <div className="mt-5 flex h-36 items-end gap-2">
          {bars.map((bar) => (
            <div key={bar.label} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-brand/80"
                style={{ height: `${Math.max(8, (bar.value / maximum) * 110)}px` }}
              />
              <span className="w-full truncate text-center text-[9px] text-muted-foreground">
                {bar.label}
              </span>
            </div>
          ))}
        </div>
      </article>
      <article className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-bold">Campaign performance</h2>
        {data.campaigns.map((campaign) => (
          <div key={campaign.id} className="mt-3 flex items-center justify-between text-xs">
            <span>{campaign.adTitle}</span>
            <span className="font-bold text-brand">{campaign.contacts} contacts</span>
          </div>
        ))}
      </article>
    </section>
  );
}

function BalancePanel({ snapshot }: { snapshot: SnapshotHook }) {
  const [amount, setAmount] = useState("5000");
  const [showTopUp, setShowTopUp] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const data = snapshot.data!;
  const addPreviewCredit = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 100) {
      setNotice("Enter at least ₦100.");
      return;
    }
    try {
      const repository = await getProfileRepository();
      await repository.updatePreview((state) => {
        state.wallet.balance += value;
        state.wallet.transactions.unshift({
          id: `txn_${Date.now()}`,
          type: "Wallet top-up",
          amount: value,
          direction: "credit",
          status: "completed",
          createdAt: new Date().toISOString(),
          reference: `PREVIEW-${Date.now()}`,
        });
      });
      await snapshot.refresh();
      setShowTopUp(false);
      setNotice("Preview balance updated. Production top-up will use Paystack verification.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to add preview credit.");
    }
  };
  return (
    <section className="space-y-3">
      {notice && <Notice text={notice} />}
      <article className="rounded-2xl bg-gradient-to-br from-red-950 to-brand p-5 text-brand-foreground">
        <p className="text-xs font-bold uppercase tracking-wide text-white/75">
          FarmX service balance
        </p>
        <p className="mt-2 text-3xl font-black">₦{data.wallet.balance.toLocaleString()}</p>
        <p className="mt-2 text-xs leading-5 text-white/75">
          For FarmX subscriptions, boosts and platform services only. It is not a product-payment
          wallet.
        </p>
        <button
          onClick={() => setShowTopUp(!showTopUp)}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-brand"
        >
          <Plus className="h-3.5 w-3.5" /> Add money
        </button>
      </article>
      {showTopUp && (
        <article className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <h2 className="font-bold">Add preview money</h2>
          <Field label="Amount (₦)" value={amount} onChange={setAmount} type="number" />
          <button
            onClick={() => void addPreviewCredit()}
            className="w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-brand-foreground"
          >
            Add preview credit
          </button>
        </article>
      )}
      <article className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-bold">Transactions</h2>
        </div>
        <div className="divide-y divide-border">
          {data.wallet.transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-bold">{transaction.type}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {transaction.reference} · {formatDate(transaction.createdAt)} ·{" "}
                  {transaction.status}
                </p>
              </div>
              <strong
                className={transaction.direction === "credit" ? "text-green-600" : "text-brand"}
              >
                {transaction.direction === "credit" ? "+" : "−"}₦
                {transaction.amount.toLocaleString()}
              </strong>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function ServicesPanel({ snapshot }: { snapshot: SnapshotHook }) {
  const data = snapshot.data!;
  const [notice, setNotice] = useState<string | null>(null);
  const setPlan = async (plan: "FREE" | "PRO" | "BUSINESS") => {
    try {
      const repository = await getProfileRepository();
      await repository.updatePreview((state) => {
        const amount = plan === "FREE" ? 0 : plan === "PRO" ? 5600 : 25850;
        state.subscription.plan = plan;
        state.subscription.startedAt = new Date().toISOString();
        state.subscription.expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
        state.subscription.history.unshift({
          plan,
          amount,
          date: new Date().toISOString(),
          status: plan === "FREE" ? "Downgraded" : "Preview changed",
        });
        state.activity.unshift({
          id: `act_${Date.now()}`,
          type: "subscription_changed",
          title: "Subscription changed",
          detail: `Plan changed to ${plan} in preview.`,
          occurredAt: new Date().toISOString(),
        });
      });
      await snapshot.refresh();
      setNotice(`Preview plan changed to ${plan}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to change plan.");
    }
  };
  return (
    <section className="space-y-3">
      {notice && <Notice text={notice} />}
      <article className="rounded-2xl border border-brand/30 bg-brand/5 p-4">
        <p className="text-xs font-bold text-brand">CURRENT PLAN</p>
        <h2 className="mt-1 text-xl font-black">{data.subscription.plan}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Started {formatDate(data.subscription.startedAt)} · Renews{" "}
          {formatDate(data.subscription.expiresAt)}
        </p>
        <button
          onClick={() =>
            void getProfileRepository()
              .then((repository) =>
                repository.updatePreview((state) => {
                  state.subscription.autoRenew = !state.subscription.autoRenew;
                }),
              )
              .then(snapshot.refresh)
          }
          className="mt-3 rounded-lg border border-brand px-3 py-2 text-xs font-bold text-brand"
        >
          Auto-renew: {data.subscription.autoRenew ? "On" : "Off"}
        </button>
      </article>
      <div className="grid gap-2 sm:grid-cols-3">
        {(["FREE", "PRO", "BUSINESS"] as const).map((plan) => (
          <article
            key={plan}
            className={`rounded-2xl border p-4 ${data.subscription.plan === plan ? "border-brand bg-brand/5" : "border-border bg-card"}`}
          >
            <h3 className="font-black">{plan}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {plan === "FREE"
                ? "5 free listings"
                : plan === "PRO"
                  ? "More listings and promotion tools"
                  : "Business tools and higher limits"}
            </p>
            <button
              onClick={() => void setPlan(plan)}
              className="mt-4 w-full rounded-lg border border-brand px-3 py-2 text-xs font-bold text-brand"
            >
              {data.subscription.plan === plan ? "Current plan" : `Switch to ${plan}`}
            </button>
          </article>
        ))}
      </div>
      <article className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-bold">Subscription history</h2>
        {data.subscription.history.map((entry, index) => (
          <div key={`${entry.date}-${index}`} className="mt-3 flex justify-between text-xs">
            <span>
              {entry.plan} · {entry.status}
            </span>
            <strong>₦{entry.amount.toLocaleString()}</strong>
          </div>
        ))}
      </article>
    </section>
  );
}

function SavedAdsPanel({ snapshot }: { snapshot: SnapshotHook }) {
  const [notice, setNotice] = useState<string | null>(null);
  const data = snapshot.data!;
  const remove = async (id: string) => {
    const repository = await getProfileRepository();
    await repository.updatePreview((state) => {
      state.savedAds = state.savedAds.filter((ad) => ad.id !== id);
    });
    await snapshot.refresh();
    setNotice("Saved advert removed.");
  };
  return (
    <section className="space-y-3">
      {notice && <Notice text={notice} />}
      {data.savedAds.length === 0 ? (
        <Empty text="No saved adverts yet." />
      ) : (
        data.savedAds.map((ad) => (
          <article key={ad.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold">{ad.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ad.seller} · {ad.location} · {ad.status}
                </p>
                <p className="mt-1 text-sm font-black text-brand">₦{ad.price.toLocaleString()}</p>
              </div>
              <Heart className="h-4 w-4 fill-brand text-brand" />
            </div>
            <div className="mt-3 flex gap-2">
              <Link
                to="/market"
                className="rounded-lg border border-border px-3 py-2 text-xs font-bold"
              >
                Open advert
              </Link>
              <button
                onClick={() =>
                  void navigator.clipboard.writeText(`${window.location.origin}/market`)
                }
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-bold"
              >
                <Share2 className="h-3 w-3" />
                Share
              </button>
              <button
                onClick={() => void remove(ad.id)}
                className="rounded-lg border border-brand/30 px-3 py-2 text-xs font-bold text-brand"
              >
                Remove
              </button>
            </div>
          </article>
        ))
      )}
    </section>
  );
}

function NetworkPanel({ snapshot }: { snapshot: SnapshotHook }) {
  const [notice, setNotice] = useState<string | null>(null);
  const data = snapshot.data!;
  const toggle = async (id: string) => {
    const repository = await getProfileRepository();
    await repository.updatePreview((state) => {
      const person = state.people.find((entry) => entry.id === id);
      if (person) person.following = !person.following;
    });
    await snapshot.refresh();
    setNotice("Connection updated in preview.");
  };
  return (
    <section className="space-y-3">
      {notice && <Notice text={notice} />}
      {data.people.map((person) => (
        <article
          key={person.id}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-xs font-black text-brand">
            {person.name
              .split(" ")
              .map((word) => word[0])
              .join("")
              .slice(0, 2)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold">{person.name}</h2>
            <p className="truncate text-[11px] text-muted-foreground">
              @{person.username} · {person.role} · {person.location}
            </p>
            {person.followsYou && (
              <p className="mt-1 text-[10px] font-bold text-brand">Follows you</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => void toggle(person.id)}
              className="inline-flex items-center gap-1 rounded-lg border border-brand px-2.5 py-1.5 text-xs font-bold text-brand"
            >
              {person.following ? (
                <>
                  <UserMinus className="h-3 w-3" />
                  Unfollow
                </>
              ) : (
                <>
                  <UserPlus className="h-3 w-3" />
                  Follow
                </>
              )}
            </button>
            <Link
              to="/u/$username"
              params={{ username: person.username }}
              className="text-center text-[10px] font-bold text-muted-foreground"
            >
              View profile
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted p-2 text-center">
      <p className="font-black">{value.toLocaleString()}</p>
      <p className="mt-0.5 text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
function Notice({ text }: { text: string }) {
  return <p className="rounded-xl bg-brand/5 px-3 py-2 text-xs font-semibold text-brand">{text}</p>;
}
function RetryPanel({ message, retry }: { message: string; retry: () => Promise<void> }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 text-center">
      <p className="font-bold">Profile data could not load.</p>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
      <button
        onClick={() => void retry()}
        className="mt-3 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-brand-foreground"
      >
        Retry
      </button>
    </section>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-border bg-card p-7 text-center">
      <Heart className="mx-auto h-8 w-8 text-brand" />
      <p className="mt-3 text-sm font-bold">{text}</p>
    </section>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
      />
    </label>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
