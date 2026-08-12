import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "@/lib/location";
import { useNotifications } from "@/lib/notifications-store";
import { useRealWeather } from "@/lib/weather";
import { news, posts, products, jobs } from "@/lib/mock-data";
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
  ChevronRight,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const { t } = useI18n();
  const { location, setLocation, all } = useLocation();
  const { notify } = useNotifications();
  const { weather, loading: weatherLoading } = useRealWeather(location);
  const [locOpen, setLocOpen] = useState(false);
  const [shortcutsExpanded, setShortcutsExpanded] = useState(false);

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

  const visibleShortcuts = shortcutsExpanded ? dashIcons : dashIcons.slice(0, 4);

  const localProducts = useMemo(() => {
    const local = products.filter((product) => product.location === location);
    const rest = products.filter((product) => product.location !== location);
    return [...local, ...rest].slice(0, 30);
  }, [location]);

  const localJobs = useMemo(() => {
    const local = jobs.filter((job) => job.location === location);
    const rest = jobs.filter((job) => job.location !== location);
    return [...local, ...rest].slice(0, 3);
  }, [location]);

  useEffect(() => {
    if (weatherLoading || weather.source !== "live" || typeof window === "undefined") return;
    const key = `farmx-weather-notified:${location}`;
    const previous = Number(sessionStorage.getItem(key) ?? "0");
    if (Date.now() - previous < 6 * 60 * 60 * 1000) return;

    sessionStorage.setItem(key, String(Date.now()));
    notify({
      type: "order",
      title: `Weather update for ${location}`,
      body: `${weather.temperature}°C · ${weather.summary} · Humidity ${weather.humidity}%`,
      link: "/",
    });
  }, [location, notify, weather, weatherLoading]);

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
              onClick={() => setLocOpen((open) => !open)}
              aria-haspopup="listbox"
              aria-expanded={locOpen}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-semibold"
            >
              <MapPin className="h-3.5 w-3.5 text-brand" /> {location}
              <ChevronDown className="h-3 w-3" />
            </button>
            {locOpen && (
              <div
                role="listbox"
                aria-label="Select Nigerian state"
                className="absolute right-0 mt-1 w-48 rounded-xl bg-card border border-border shadow-lg z-20 overflow-hidden max-h-60 overflow-y-auto"
              >
                {all.map((state) => (
                  <button
                    key={state}
                    role="option"
                    aria-selected={state === location}
                    onClick={() => {
                      setLocation(state);
                      setLocOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${state === location ? "text-brand font-semibold" : ""}`}
                  >
                    {state}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <section
          className="rounded-2xl p-4 bg-gradient-to-br from-brand to-black text-white shadow-lg"
          aria-label="Live weather"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-white/80 text-xs">
                <Cloud className="h-4 w-4" /> {location}, Nigeria
                <span className="rounded-full border border-white/20 px-1.5 py-0.5 text-[9px]">
                  {weather.source === "live" ? "LIVE" : "RETRYING"}
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{weather.temperature}°</span>
                <span className="text-white/80">
                  C · {weatherLoading ? "Updating weather" : weather.summary}
                </span>
              </div>
              <div className="mt-3 flex gap-4 text-xs text-white/90">
                <span className="flex items-center gap-1">
                  <Droplets className="h-3.5 w-3.5" /> {weather.humidity}%
                </span>
                <span className="flex items-center gap-1">
                  <Sun className="h-3.5 w-3.5" /> UV {weather.uvIndex}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/70 uppercase tracking-wide">Harvest</div>
              <div className="text-lg font-semibold">Good ✓</div>
              <p className="mt-1 text-[9px] text-white/60">Updated automatically</p>
            </div>
          </div>
        </section>

        <section aria-label="Quick access">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold">Quick access</h2>
            <button
              onClick={() => setShortcutsExpanded((expanded) => !expanded)}
              className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand"
              aria-expanded={shortcutsExpanded}
            >
              {shortcutsExpanded ? "Show less" : "See all"}
              <ChevronRight
                className={`h-3.5 w-3.5 transition-transform ${shortcutsExpanded ? "rotate-90" : ""}`}
              />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {visibleShortcuts.map(({ to, icon: Icon, label }) => (
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
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-bold">Kayayyaki a {location}</h2>
              <p className="text-[11px] text-muted-foreground">
                Kayayyaki 30 daga jihohin Najeriya
              </p>
            </div>
            <Link
              to="/market"
              className="inline-flex items-center gap-0.5 text-xs text-brand font-semibold"
            >
              See all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {localProducts.map((product) => (
              <Link
                key={product.id}
                to="/product/$id"
                params={{ id: product.id }}
                className="rounded-xl bg-card border border-border overflow-hidden relative hover:border-brand transition-colors"
              >
                {product.promoted && (
                  <span className="absolute top-1.5 left-1.5 z-10 text-[9px] px-1.5 py-0.5 rounded-full bg-brand text-brand-foreground font-bold">
                    PROMO
                  </span>
                )}
                <div className="aspect-square bg-brand/5 flex items-center justify-center text-4xl">
                  {product.image}
                </div>
                <div className="p-2">
                  <p className="font-semibold text-xs truncate">{product.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-bold text-brand">
                      ₦{product.price.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px]">
                      <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />
                      {product.rating}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5 flex items-center gap-0.5">
                    <MapPin className="h-2.5 w-2.5" />
                    {product.location}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <Link
            to="/market"
            className="mt-3 flex items-center justify-center gap-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-brand hover:bg-accent"
          >
            See all products <ChevronRight className="h-4 w-4" />
          </Link>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">Ayyuka a {location}</h2>
            <Link to="/jobs" className="text-xs text-brand font-semibold">
              See all
            </Link>
          </div>
          <div className="space-y-2">
            {localJobs.map((job) => (
              <div key={job.id} className="p-3 rounded-xl bg-card border border-border">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      {job.title}
                      {job.promoted && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand text-brand-foreground font-bold">
                          PROMO
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Building2 className="h-2.5 w-2.5" />
                        {job.company}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-2.5 w-2.5" />
                        {job.location}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-brand">{job.salary}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">{t("news")}</h2>
            <span className="text-xs text-muted-foreground">Sabbin Labarai</span>
          </div>
          <div className="space-y-2">
            {news.map((article) => (
              <div key={article.id} className="p-3 rounded-xl bg-card border border-border">
                <p className="text-sm font-medium">{article.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {article.source} · {article.time}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">{t("community")}</h2>
            <Link to="/community" className="text-xs text-brand font-semibold">
              See all
            </Link>
          </div>
          <div className="space-y-2">
            {posts.slice(0, 2).map((post) => (
              <div key={post.id} className="p-3 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-brand/20 flex items-center justify-center text-xs font-bold text-brand">
                    {post.author.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{post.author}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {post.handle} · {post.time}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-sm">{post.content}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
