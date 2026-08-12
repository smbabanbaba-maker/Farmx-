import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "@/lib/location";
import { jobs, news, posts, products, type Product } from "@/lib/mock-data";
import {
  BarChart3,
  Briefcase,
  Building2,
  ChevronDown,
  Clock3,
  GraduationCap,
  MapPin,
  Package,
  Search,
  Star,
  Truck,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { location, setLocation, all } = useLocation();
  const [locOpen, setLocOpen] = useState(false);
  const [expandedHighlights, setExpandedHighlights] = useState(false);

  const shortcuts = [
    { to: "/market", icon: Search, label: "Market" },
    { to: "/jobs", icon: Briefcase, label: t("jobs") },
    { to: "/learn", icon: GraduationCap, label: t("learn") },
    { to: "/analytics", icon: BarChart3, label: t("analytics") },
    { to: "/fleet", icon: Truck, label: t("fleet") },
    { to: "/inventory", icon: Package, label: t("inventory") },
    { to: "/staff", icon: UsersRound, label: t("staff") },
  ] as const;

  const localFirstProducts = useMemo(() => {
    const nearby = products.filter((product) => product.location === location);
    const elsewhere = products.filter((product) => product.location !== location);
    return [...nearby, ...elsewhere];
  }, [location]);

  const topThree = localFirstProducts.slice(0, 3);
  const remainingHighlights = localFirstProducts.slice(3);
  const localJobs = useMemo(() => {
    const nearby = jobs.filter((job) => job.location === location);
    const elsewhere = jobs.filter((job) => job.location !== location);
    return [...nearby, ...elsewhere].slice(0, 3);
  }, [location]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{t("greeting")},</p>
            <h1 className="text-2xl font-bold">Ibrahim 👋</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Discover trusted listings around you.
            </p>
          </div>
          <div className="relative shrink-0">
            <button
              onClick={() => setLocOpen((open) => !open)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-card border border-border text-xs font-semibold"
              aria-expanded={locOpen}
              aria-label="Select Nigerian state"
            >
              <MapPin className="h-3.5 w-3.5 text-brand" /> {location}
              <ChevronDown className="h-3 w-3" />
            </button>
            {locOpen && (
              <div className="absolute right-0 mt-1 w-52 rounded-xl bg-card border border-border shadow-lg z-20 overflow-hidden max-h-72 overflow-y-auto">
                {all.map((state) => (
                  <button
                    key={state}
                    onClick={() => {
                      setLocation(state);
                      setLocOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 text-sm hover:bg-accent ${state === location ? "text-brand font-semibold bg-brand/5" : ""}`}
                  >
                    {state}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <section className="rounded-2xl p-4 bg-gradient-to-br from-brand to-black text-white shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-white/75 uppercase tracking-wide">Marketplace pulse</p>
              <h2 className="mt-1 text-xl font-bold">Fresh listings in {location}</h2>
              <p className="mt-2 text-sm text-white/80">
                Find cars, phones, furniture, fashion, services and more from verified local
                sellers.
              </p>
            </div>
            <div className="h-11 w-11 shrink-0 rounded-2xl bg-white/15 grid place-items-center">
              <Search className="h-5 w-5" />
            </div>
          </div>
          <Link
            to="/market"
            className="mt-4 inline-flex items-center rounded-lg bg-white px-3 py-2 text-xs font-bold text-black"
          >
            Browse marketplace
          </Link>
        </section>

        <section className="-mx-4 px-4 overflow-hidden" aria-label="Marketplace shortcuts">
          <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
            {shortcuts.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-card border border-border hover:border-brand transition-colors text-[11px] font-semibold whitespace-nowrap"
              >
                <Icon className="h-4 w-4 text-brand" />
                {label}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between gap-3 mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Top picks near you</p>
              <h2 className="font-bold">Featured listings in {location}</h2>
            </div>
            <button
              onClick={() => {
                if (expandedHighlights) navigate({ to: "/market" });
                else setExpandedHighlights(true);
              }}
              className="text-xs text-brand font-bold whitespace-nowrap"
            >
              {expandedHighlights ? "Open market →" : "See all"}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {topThree.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {expandedHighlights && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {remainingHighlights.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">Jobs around {location}</h2>
            <Link to="/jobs" className="text-xs text-brand font-semibold">
              See all
            </Link>
          </div>
          <div className="space-y-2">
            {localJobs.map((job) => (
              <div key={job.id} className="p-3 rounded-xl bg-card border border-border">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 h-8 w-8 rounded-lg bg-brand/10 grid place-items-center">
                    <Briefcase className="h-4 w-4 text-brand" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      {job.title}
                      {job.promoted && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand text-brand-foreground font-bold">
                          PROMO
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Building2 className="h-3 w-3" />
                        {job.company}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </span>
                      <span>{job.type}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">Marketplace news</h2>
            <span className="text-xs text-muted-foreground">Latest updates</span>
          </div>
          <div className="space-y-2">
            {news.map((item) => (
              <div key={item.id} className="p-3 rounded-xl bg-card border border-border">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.source} · {item.time}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">Community</h2>
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

        <section className="pb-2">
          <div className="flex items-end justify-between gap-3 mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Keep exploring</p>
              <h2 className="font-bold">Latest products</h2>
            </div>
            <span className="text-xs text-muted-foreground">{products.length} listings</span>
          </div>
          <div className="space-y-2">
            {products.slice(0, 40).map((product) => (
              <Link
                key={product.id}
                to="/product/$id"
                params={{ id: product.id }}
                className="flex gap-3 p-2 rounded-xl bg-card border border-border hover:border-brand transition-colors"
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-20 w-20 shrink-0 rounded-lg object-cover bg-muted"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1 py-0.5">
                  <p className="font-semibold text-sm truncate">{product.name}</p>
                  <p className="mt-1 text-sm font-bold text-brand">
                    ₦{product.price.toLocaleString()}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {product.location} · {product.category}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <Link
            to="/market"
            className="mt-3 flex items-center justify-center py-3 rounded-xl border border-brand text-brand text-sm font-bold"
          >
            See all products
          </Link>
        </section>
      </div>
    </AppShell>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to="/product/$id"
      params={{ id: product.id }}
      className="rounded-xl bg-card border border-border overflow-hidden relative hover:border-brand transition-colors"
    >
      {product.promoted && (
        <span className="absolute top-1.5 left-1.5 z-10 text-[9px] px-1.5 py-0.5 rounded-full bg-brand text-brand-foreground font-bold">
          PROMO
        </span>
      )}
      <img
        src={product.image}
        alt={product.name}
        className="aspect-square w-full object-cover bg-muted"
        loading="lazy"
      />
      <div className="p-2.5">
        <p className="font-semibold text-xs truncate">{product.name}</p>
        <p className="mt-1 text-xs font-bold text-brand">₦{product.price.toLocaleString()}</p>
        <div className="mt-1 flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
          <span className="truncate flex items-center gap-0.5">
            <MapPin className="h-2.5 w-2.5" />
            {product.location}
          </span>
          <span className="flex items-center gap-0.5 text-foreground shrink-0">
            <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />
            {product.rating}
          </span>
        </div>
      </div>
    </Link>
  );
}
