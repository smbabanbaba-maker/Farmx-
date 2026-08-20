import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TrendingUp, Eye, Bookmark, MessageSquare, Award, Users, ShoppingBag } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getAnalyticsRepository } from "@/lib/analytics-repository";
import type {
  UserAnalytics,
  SellerAnalytics,
  AdminAnalytics,
  AnalyticsRole,
  TimeRange,
} from "@/lib/analytics.types";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsDashboard,
});

function AnalyticsDashboard() {
  const [role, setRole] = useState<AnalyticsRole>("seller");
  const [range, setRange] = useState<TimeRange>("30d");
  const [userStats, setUserStats] = useState<UserAnalytics | null>(null);
  const [sellerStats, setSellerStats] = useState<SellerAnalytics | null>(null);
  const [adminStats, setAdminStats] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const repo = await getAnalyticsRepository();
        const [u, s, a] = await Promise.all([
          repo.getUserAnalytics(undefined, range),
          repo.getSellerAnalytics(undefined, range),
          repo.getAdminAnalytics(range),
        ]);
        if (cancelled) return;
        setUserStats(u);
        setSellerStats(s);
        setAdminStats(a);
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
  }, [range]);

  return (
    <AppShell title="Analytics">
      <div className="space-y-6 pb-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-muted-foreground">
              Performance insights and real-time activity metrics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as TimeRange)}
              className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold"
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="12m">Last 12 Months</option>
            </select>
          </div>
        </div>

        <div className="flex overflow-x-auto border-b border-border gap-2 pb-1 text-xs font-black">
          {[
            { id: "seller", label: "Seller Stats" },
            { id: "user", label: "Personal Activity" },
            { id: "admin", label: "Platform Admin" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRole(tab.id as AnalyticsRole)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 transition ${role === tab.id ? "bg-brand text-brand-foreground" : "bg-card border border-border hover:border-brand/50 text-muted-foreground"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
            <div className="h-64 animate-pulse rounded-3xl bg-muted" />
          </div>
        ) : (
          <div className="space-y-6">
            {role === "seller" && sellerStats && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard
                    title="Active Listings"
                    value={sellerStats.activeListings}
                    icon={ShoppingBag}
                  />
                  <StatCard title="Total Views" value={sellerStats.totalViews} icon={Eye} />
                  <StatCard
                    title="Saves & Shares"
                    value={sellerStats.totalSaves + sellerStats.totalShares}
                    icon={Bookmark}
                  />
                  <StatCard
                    title="Customer Inquiries"
                    value={sellerStats.totalInquiries}
                    icon={MessageSquare}
                  />
                </div>

                <div className="rounded-3xl border border-border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-black flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-brand" /> Weekly Listing Views
                  </h3>
                  <div className="flex items-end gap-3 h-40 pt-6">
                    {sellerStats.viewsOverTime.map((v) => {
                      const max = Math.max(...sellerStats.viewsOverTime.map((x) => x.count), 10);
                      const heightPercent = Math.round((v.count / max) * 100);
                      return (
                        <div
                          key={v.date}
                          className="flex-1 flex flex-col items-center gap-2 h-full justify-end"
                        >
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {v.count}
                          </span>
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className="w-full rounded-t-xl bg-brand transition-all hover:bg-brand/80"
                          />
                          <span className="text-[10px] font-bold">{v.date}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-3xl border border-border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-black">Top Performing Listings</h3>
                  <div className="space-y-3">
                    {sellerStats.topListings.map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center justify-between rounded-2xl border border-border p-3"
                      >
                        <div>
                          <p className="text-xs font-black">{l.title}</p>
                          <p className="text-[10px] text-muted-foreground">
                            ₦{l.price.toLocaleString()}
                          </p>
                        </div>
                        <span className="rounded-full bg-brand/10 px-3 py-1 text-[10px] font-black text-brand">
                          {l.views} views
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {role === "user" && userStats && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard
                  title="Listings Posted"
                  value={userStats.listingsPosted}
                  icon={ShoppingBag}
                />
              </div>
            )}

            {role === "admin" && adminStats && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard
                    title="Total Users"
                    value={adminStats.totalUsers.toLocaleString()}
                    icon={Users}
                  />
                  <StatCard
                    title="Active Listings"
                    value={adminStats.activeListings.toLocaleString()}
                    icon={ShoppingBag}
                  />
                </div>
                <div className="rounded-3xl border border-border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-black">Platform Growth Trends</h3>
                  <div className="space-y-3">
                    {adminStats.growthChart.map((g) => (
                      <div
                        key={g.date}
                        className="flex items-center justify-between rounded-2xl border border-border p-3 text-xs"
                      >
                        <span className="font-black">{g.date}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">
                            Users:{" "}
                            <strong className="text-foreground">{g.users.toLocaleString()}</strong>
                          </span>
                          <span className="text-brand font-bold">
                            Listings: {g.listings.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-2 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <div className="rounded-full bg-brand/10 p-2 text-brand">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-xl font-black">{value}</p>
    </div>
  );
}
