import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { FarmXSearchBar } from "@/components/FarmXSearchBar";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "@/lib/location";
import { useNotifications } from "@/lib/notifications-store";
import { useRealWeather } from "@/lib/weather";
import { useProfileData } from "@/lib/use-profile";
import { createSeoHead, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { news, posts, products, jobs } from "@/lib/mock-data";
import {
  ShoppingBag,
  Wallet,
  Briefcase,
  GraduationCap,
  BarChart3,
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

export const Route = createFileRoute("/")({
  head: () =>
    createSeoHead({
      title: "FarmX — Agricultural Marketplace, Jobs & Community",
      description:
        "Buy and sell agricultural products, discover jobs, learn practical skills and connect with Nigeria’s farming community on FarmX.",
      path: "/",
      image: "/farmx-logo.png",
      keywords: [
        "FarmX",
        "Nigeria agricultural marketplace",
        "farm products",
        "agriculture jobs",
        "FarmX Learn",
      ],
      jsonLd: [organizationJsonLd(), websiteJsonLd()],
    }),
  component: Dashboard,
});

function weatherSummaryKey(code: number) {
  if (code === 0) return "home.weather.clearSky";
  if ([1, 2, 3].includes(code)) return "home.weather.partlyCloudy";
  if ([45, 48].includes(code)) return "home.weather.foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "home.weather.drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "home.weather.rainShowers";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "home.weather.snowShowers";
  if ([95, 96, 99].includes(code)) return "home.weather.thunderstorms";
  if (code < 0) return "home.weather.unavailable";
  return "home.weather.changingConditions";
}

function Dashboard() {
  const { t } = useI18n();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const active = localStorage.getItem("farmx-session-active") === "true";
      setIsLoggedIn(active);
      if (
        !active &&
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/signup"
      ) {
        window.location.assign("/login");
      }
    }
  }, []);
  const { location, setLocation, all } = useLocation();
  const { profile } = useProfileData();
  const { notify } = useNotifications();
  const { weather, loading: weatherLoading } = useRealWeather(location);
  const localizedWeatherSummary = t(weatherSummaryKey(weather.code));
  const [locOpen, setLocOpen] = useState(false);
  const [quickAccessExpanded, setQuickAccessExpanded] = useState(false);
  const dashIcons = [
    { to: "/market", icon: ShoppingBag, label: t("market") },
    { to: "/jobs", icon: Briefcase, label: t("jobs") },
    { to: "/learn", icon: GraduationCap, label: t("learn") },
    { to: "/analytics", icon: BarChart3, label: t("analytics") },
    { to: "/wallet", icon: Wallet, label: t("wallet") },
  ] as const;

  const visibleShortcuts = quickAccessExpanded ? dashIcons : dashIcons.slice(0, 4);

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
      title: t("home.weather.notifTitle", { location }),
      body: t("home.weather.notifBody", {
        temp: weather.temperature,
        summary: localizedWeatherSummary,
        humidity: weather.humidity,
      }),
      link: "/",
    });
  }, [location, notify, weather, weatherLoading]);

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {profile?.fullName
                ? t("home.greeting", { name: profile.fullName.split(/\s+/)[0] })
                : t("greeting")}
            </p>
            <h1 className="text-2xl font-bold">{profile?.fullName ?? t("profile")}</h1>
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
                aria-label={t("home.location.selectState")}
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
          aria-label={t("weather")}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-white/80 text-xs">
                <Cloud className="h-4 w-4" /> {location}, Nigeria
                <span className="rounded-full border border-white/20 px-1.5 py-0.5 text-[9px]">
                  {weather.source === "live" ? t("home.weather.live") : t("home.weather.retrying")}
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{weather.temperature}°</span>
                <span className="text-white/80">
                  C · {weatherLoading ? t("home.weather.updating") : localizedWeatherSummary}
                </span>
              </div>
              <div className="mt-3 flex gap-4 text-xs text-white/90">
                <span className="flex items-center gap-1">
                  <Droplets className="h-3.5 w-3.5" /> {weather.humidity}%{" "}
                  {t("home.weather.humidity")}
                </span>
                <span className="flex items-center gap-1">
                  <Sun className="h-3.5 w-3.5" /> {t("home.weather.uv")} {weather.uvIndex}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/70 uppercase tracking-wide">
                {t("home.weather.harvest")}
              </div>
              <div className="text-lg font-semibold">{t("home.weather.good")} ✓</div>
              <p className="mt-1 text-[9px] text-white/60">
                {t("home.weather.updatedAutomatically")}
              </p>
            </div>
          </div>
        </section>

        <section
          aria-label={t("home.search.title")}
          className="rounded-2xl border border-border bg-card p-3 shadow-sm"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand">
                {t("home.search.title")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("home.search.subtitle")}</p>
            </div>
          </div>
          <FarmXSearchBar compact location={location} />
        </section>

        <section aria-label={t("home.quickAccess.title")}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold">{t("home.quickAccess.title")}</h2>
            <button
              type="button"
              onClick={() => setQuickAccessExpanded((expanded) => !expanded)}
              aria-expanded={quickAccessExpanded}
              className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand"
            >
              {quickAccessExpanded ? t("home.quickAccess.seeLess") : t("home.quickAccess.seeAll")}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex min-w-0 gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible">
            {visibleShortcuts.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className="flex min-w-[84px] shrink-0 flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 transition-colors hover:border-brand sm:min-w-0"
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
              <h2 className="font-bold">{t("home.marketplace.title", { location })}</h2>
              <p className="text-[11px] text-muted-foreground">
                {t("home.marketplace.subtitle", { stateCount: all.length })}
              </p>
            </div>
            <Link
              to="/market"
              className="inline-flex items-center gap-0.5 text-xs text-brand font-semibold"
            >
              {t("seeAll")} <ChevronRight className="h-3.5 w-3.5" />
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
                    {t("home.marketplace.promo")}
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
            {t("home.marketplace.productsSeeAll")} <ChevronRight className="h-4 w-4" />
          </Link>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">{t("home.jobs.title", { location })}</h2>
            <Link
              to="/jobs"
              search={{ q: "", category: undefined, tab: "explore" }}
              className="text-xs text-brand font-semibold"
            >
              {t("seeAll")}
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
                          {t("home.jobs.promo")}
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
            <span className="text-xs text-muted-foreground">{t("news")}</span>
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
              {t("home.community.seeAll")}
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
