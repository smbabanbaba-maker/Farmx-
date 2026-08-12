import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "@/lib/location";
import { news, posts, products, jobs, transactions } from "@/lib/mock-data";
import {
  ShoppingBag,
  Wallet,
  Briefcase,
  GraduationCap,
  BarChart3,
  Truck,
  Package,
  UsersRound,
  Cloud,
  Droplets,
  Sun,
  MapPin,
  Star,
  Building2,
  ChevronDown,
} from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const { t } = useI18n();
  const { location, setLocation, all } = useLocation();
  const [locOpen, setLocOpen] = useState(false);

  const dashIcons = [
    { to: "/market", icon: ShoppingBag, label: t("market") },
    { to: "/wallet", icon: Wallet, label: t("wallet") },
    { to: "/jobs", icon: Briefcase, label: t("jobs") },
    { to: "/learn", icon: GraduationCap, label: t("learn") },
    { to: "/analytics", icon: BarChart3, label: t("analytics") },
    { to: "/fleet", icon: Truck, label: t("fleet") },
    { to: "/inventory", icon: Package, label: t("inventory") },
    { to: "/staff", icon: UsersRound, label: t("staff") },
  ] as const;

  const localProducts = useMemo(() => {
    const local = products.filter((p) => p.location === location);
    const rest = products.filter((p) => p.location !== location);
    return [...local, ...rest].slice(0, 6);
  }, [location]);

  const localJobs = useMemo(() => {
    const local = jobs.filter((j) => j.location === location);
    const rest = jobs.filter((j) => j.location !== location);
    return [...local, ...rest].slice(0, 3);
  }, [location]);

  const walletBalance = 248500;
  const recentTx = transactions.slice(0, 2);

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t("greeting")},</p>
            <h1 className="text-2xl font-bold">Ibrahim 👋</h1>
          </div>
          <div className="relative">
            <button
              onClick={() => setLocOpen(!locOpen)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-semibold"
            >
              <MapPin className="h-3.5 w-3.5 text-brand" /> {location}{" "}
              <ChevronDown className="h-3 w-3" />
            </button>
            {locOpen && (
              <div className="absolute right-0 mt-1 w-40 rounded-xl bg-card border border-border shadow-lg z-20 overflow-hidden max-h-60 overflow-y-auto">
                {all.map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      setLocation(l);
                      setLocOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${l === location ? "text-brand font-semibold" : ""}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Weather widget */}
        <div className="rounded-2xl p-4 bg-gradient-to-br from-brand to-black text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-white/80 text-xs">
                <Cloud className="h-4 w-4" /> {location}, Nigeria
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-4xl font-bold">32°</span>
                <span className="text-white/80">C · Partly sunny</span>
              </div>
              <div className="mt-3 flex gap-4 text-xs text-white/90">
                <span className="flex items-center gap-1">
                  <Droplets className="h-3.5 w-3.5" /> 68%
                </span>
                <span className="flex items-center gap-1">
                  <Sun className="h-3.5 w-3.5" /> UV 7
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/70 uppercase tracking-wide">Harvest</div>
              <div className="text-lg font-semibold">Good ✓</div>
            </div>
          </div>
        </div>

        {/* Wallet summary */}
        <Link to="/wallet" className="block rounded-2xl p-4 bg-card border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground tracking-wide">
                {t("balance")}
              </p>
              <p className="text-xl font-bold mt-0.5">₦{walletBalance.toLocaleString()}</p>
            </div>
            <span className="text-xs text-brand font-semibold">View wallet →</span>
          </div>
          <div className="mt-3 space-y-1.5">
            {recentTx.map((tx) => (
              <div key={tx.id} className="flex justify-between text-xs">
                <span className="text-muted-foreground truncate">{tx.label}</span>
                <span
                  className={
                    tx.amount > 0
                      ? "text-green-600 dark:text-green-400 font-semibold"
                      : "text-brand font-semibold"
                  }
                >
                  {tx.amount > 0 ? "+" : ""}₦{Math.abs(tx.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Link>

        {/* Dashboard icons grid */}
        <div className="grid grid-cols-4 gap-3">
          {dashIcons.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border hover:border-brand transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-brand" />
              </div>
              <span className="text-[11px] font-medium text-center leading-tight">{label}</span>
            </Link>
          ))}
        </div>

        {/* Products near you */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">Kayayyaki a {location}</h2>
            <Link to="/market" className="text-xs text-brand font-semibold">
              See all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {localProducts.map((p) => (
              <div
                key={p.id}
                className="rounded-xl bg-card border border-border overflow-hidden relative"
              >
                {p.promoted && (
                  <span className="absolute top-1.5 left-1.5 z-10 text-[9px] px-1.5 py-0.5 rounded-full bg-brand text-brand-foreground font-bold">
                    PROMO
                  </span>
                )}
                <div className="aspect-square bg-brand/5 flex items-center justify-center text-4xl">
                  {p.image}
                </div>
                <div className="p-2">
                  <p className="font-semibold text-xs truncate">{p.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-bold text-brand">
                      ₦{p.price.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px]">
                      <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />
                      {p.rating}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5 flex items-center gap-0.5">
                    <MapPin className="h-2.5 w-2.5" />
                    {p.location}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Jobs near you */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">Ayyuka a {location}</h2>
            <Link to="/jobs" className="text-xs text-brand font-semibold">
              See all
            </Link>
          </div>
          <div className="space-y-2">
            {localJobs.map((j) => (
              <div key={j.id} className="p-3 rounded-xl bg-card border border-border">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      {j.title}
                      {j.promoted && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand text-brand-foreground font-bold">
                          PROMO
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Building2 className="h-2.5 w-2.5" />
                        {j.company}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-2.5 w-2.5" />
                        {j.location}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-brand">{j.salary}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* News */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">{t("news")}</h2>
            <span className="text-xs text-muted-foreground">Sabbin Labarai</span>
          </div>
          <div className="space-y-2">
            {news.map((n) => (
              <div key={n.id} className="p-3 rounded-xl bg-card border border-border">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {n.source} · {n.time}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Community */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">{t("community")}</h2>
            <Link to="/community" className="text-xs text-brand font-semibold">
              See all
            </Link>
          </div>
          <div className="space-y-2">
            {posts.slice(0, 2).map((p) => (
              <div key={p.id} className="p-3 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-brand/20 flex items-center justify-center text-xs font-bold text-brand">
                    {p.author.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{p.author}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.handle} · {p.time}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-sm">{p.content}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
