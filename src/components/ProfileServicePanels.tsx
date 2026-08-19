import { Link } from "@tanstack/react-router";
import type { useProfileSnapshot } from "@/lib/use-profile-snapshot";
import { BarChart3, CreditCard, Heart, LineChart, WalletCards } from "lucide-react";
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
  if (snapshot.status === "error" || !snapshot.data) {
    return (
      <RetryPanel
        message={snapshot.error ?? "Unable to load Profile service data."}
        retry={snapshot.refresh}
      />
    );
  }
  if (section === "promotions") return <PromotionsPanel snapshot={snapshot} />;
  if (section === "analytics") return <AnalyticsPanel snapshot={snapshot} />;
  if (section === "balance") return <BalancePanel />;
  if (section === "services") return <ServicesPanel />;
  if (section === "saved") return <SavedAdsPanel />;
  return <NetworkPanel snapshot={snapshot} />;
}

function PromotionsPanel({ snapshot }: { snapshot: SnapshotHook }) {
  const data = snapshot.data!;
  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-black uppercase tracking-wider text-brand">
          Promotion management
        </p>
        <h2 className="mt-1 text-lg font-black">Promote an active listing</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Boosts and featured placements are created through the verified payment flow. Goall26 does
          not display or create simulated campaigns.
        </p>
        <Link
          to="/settings/$section"
          params={{ section: "boosting" }}
          className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2.5 text-xs font-black text-brand-foreground"
        >
          Open boosting settings
        </Link>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-brand" />
          <h2 className="font-bold">Current listing activity</h2>
        </div>
        {data.ads.length === 0 ? (
          <Empty text="No active listings are available for promotion." />
        ) : (
          <div className="mt-3 space-y-2">
            {data.ads.slice(0, 5).map((ad) => (
              <div
                key={ad.listingId}
                className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0"
              >
                <span className="min-w-0 truncate text-sm font-semibold">{ad.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {ad.viewCount.toLocaleString()} views
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AnalyticsPanel({ snapshot }: { snapshot: SnapshotHook }) {
  const data = snapshot.data!;
  const [period, setPeriod] = useState("All available data");
  const bars = useMemo(
    () => data.ads.slice(0, 5).map((ad) => ({ label: ad.title.slice(0, 12), value: ad.viewCount })),
    [data.ads],
  );
  const maximum = Math.max(...bars.map((bar) => bar.value), 1);
  return (
    <section className="space-y-3">
      <div className="flex gap-2 overflow-x-auto">
        {["All available data", "Today", "7 days", "30 days"].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setPeriod(item)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${period === item ? "border-brand bg-brand text-brand-foreground" : "border-border bg-card"}`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Mini label="Total views" value={data.stats.totalAdViews} />
        <Mini label="Saved listings" value={data.ads.reduce((sum, ad) => sum + ad.savedCount, 0)} />
        <Mini label="Active listings" value={data.stats.activeAds} />
        <Mini label="Followers" value={data.stats.followers ?? 0} />
      </div>
      <article className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">Listing views</h2>
            <p className="text-xs text-muted-foreground">
              {period} · sourced from Goall26 listing records
            </p>
          </div>
          <LineChart className="h-5 w-5 text-brand" />
        </div>
        {bars.length === 0 ? (
          <Empty text="Analytics will appear after you publish a listing." />
        ) : (
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
        )}
      </article>
    </section>
  );
}

function BalancePanel() {
  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <WalletCards className="h-5 w-5 text-brand" />
          <h2 className="font-black">Goall26 Balance</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          View your verified service balance, payment history, and available Goall26 credits in the
          secure Payments settings.
        </p>
        <Link
          to="/settings/$section"
          params={{ section: "balance" }}
          className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2.5 text-xs font-black text-brand-foreground"
        >
          Open balance
        </Link>
      </div>
    </section>
  );
}

function ServicesPanel() {
  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-brand" />
          <h2 className="font-black">Goall26 plans and services</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Subscription changes and service payments are handled server-side and activated only after
          Paystack verification.
        </p>
        <Link
          to="/settings/$section"
          params={{ section: "subscription" }}
          className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2.5 text-xs font-black text-brand-foreground"
        >
          View subscription
        </Link>
      </div>
    </section>
  );
}

function SavedAdsPanel() {
  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-brand" />
          <h2 className="font-black">Saved ads</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Saved listings and their current availability are managed from your real Market activity
          records.
        </p>
        <Link
          to="/settings/$section"
          params={{ section: "saved" }}
          className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2.5 text-xs font-black text-brand-foreground"
        >
          Open saved ads
        </Link>
      </div>
    </section>
  );
}

function NetworkPanel({ snapshot }: { snapshot: SnapshotHook }) {
  const data = snapshot.data!;
  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-black">Followers and following</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Mini label="Followers" value={data.stats.followers ?? 0} />
          <Mini label="Following" value={data.stats.following ?? 0} />
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Follow and unfollow actions are available from public seller profiles and Market listings.
          This page does not invent connection records.
        </p>
      </div>
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

function Empty({ text }: { text: string }) {
  return <p className="mt-3 rounded-xl bg-muted px-3 py-3 text-sm text-muted-foreground">{text}</p>;
}

function RetryPanel({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="rounded-2xl border border-brand/30 bg-brand/5 p-4 text-sm">
      <p>{message}</p>
      <button
        type="button"
        onClick={retry}
        className="mt-3 rounded-lg bg-brand px-3 py-2 text-xs font-black text-brand-foreground"
      >
        Retry
      </button>
    </div>
  );
}
