import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useCompany, TIER_META } from "@/lib/company-store";
import { COUNTRIES } from "@/lib/currency";
import { products } from "@/lib/mock-data";
import {
  BadgeCheck,
  Crown,
  Sparkles,
  MapPin,
  Star,
  Users2,
  TrendingUp,
  Share2,
  ArrowLeft,
  MessageCircle,
  Facebook,
  Linkedin,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/c/$slug")({
  component: MiniSite,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — FarmX Company` },
      {
        name: "description",
        content: `Verified FarmX company page for ${params.slug}. Products, partners, reviews.`,
      },
      { property: "og:title", content: `${params.slug} on FarmX` },
      { property: "og:description", content: `Verified company mini-site on FarmX.` },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function MiniSite() {
  const { slug } = Route.useParams();
  const { state, isBadgeActive } = useCompany();
  const [copied, setCopied] = useState(false);

  const company = state.company && state.company.slug === slug ? state.company : null;
  if (!company) throw notFound();

  const badgeActive = isBadgeActive();
  const tierMeta = state.tier !== "none" ? TIER_META[state.tier] : null;
  const country = COUNTRIES.find((c) => c.code === company.country);
  const theme = company.themeColor;
  const url = typeof window !== "undefined" ? `${window.location.origin}/c/${slug}` : `/c/${slug}`;

  const share = (target: "wa" | "fb" | "li" | "ig" | "copy") => {
    const text = `${company.name} on FarmX — ${company.bio}`;
    const enc = encodeURIComponent;
    if (target === "wa") window.open(`https://wa.me/?text=${enc(text + " " + url)}`, "_blank");
    else if (target === "fb")
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, "_blank");
    else if (target === "li")
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, "_blank");
    else if (target === "ig") {
      navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const companyProducts = products
    .filter((p) => p.seller.toLowerCase().includes(company.name.split(" ")[0].toLowerCase()))
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto">
        <div className="p-4 flex items-center justify-between">
          <Link
            to="/market"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Market
          </Link>
          <button onClick={() => share("copy")} className="p-2 rounded-full hover:bg-accent">
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        <div className="relative">
          <div className="h-32" style={{ background: `linear-gradient(135deg, ${theme}, #000)` }} />
          <div className="px-4 -mt-10">
            <div className="h-20 w-20 rounded-2xl bg-white border-4 border-background flex items-center justify-center text-4xl shadow-lg">
              {company.logo}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <h1 className="text-xl font-bold">{company.name}</h1>
              {badgeActive && tierMeta && (
                <span title={`${tierMeta.label} verified`}>
                  {state.tier === "platinum" ? (
                    <Crown className="h-4 w-4" style={{ color: tierMeta.color }} />
                  ) : state.tier === "gold" ? (
                    <Sparkles className="h-4 w-4" style={{ color: tierMeta.color }} />
                  ) : (
                    <BadgeCheck className="h-4 w-4" style={{ color: tierMeta.color }} />
                  )}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {company.productType} · CEO {company.ceo}
            </p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" /> {company.state}, {country?.name ?? company.country}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: theme }}>
              {url.replace(/^https?:\/\//, "")}
            </p>
            {company.bio && <p className="mt-3 text-sm">{company.bio}</p>}
          </div>
        </div>

        <div className="px-4 mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat
            icon={Users2}
            label="Followers"
            value={(company.followers || 1240).toLocaleString()}
          />
          <Stat icon={TrendingUp} label="Orders" value={state.orders.toLocaleString()} />
          <Stat icon={Star} label="Rating" value={avgRating(state.reviews).toFixed(1)} />
        </div>

        <div className="px-4 mt-4 flex gap-2">
          <button
            onClick={() => share("wa")}
            className="flex-1 py-2 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1"
            style={{ background: "#25D366" }}
          >
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </button>
          <button
            onClick={() => share("fb")}
            className="flex-1 py-2 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1"
            style={{ background: "#1877F2" }}
          >
            <Facebook className="h-3.5 w-3.5" /> Facebook
          </button>
          <button
            onClick={() => share("li")}
            className="flex-1 py-2 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1"
            style={{ background: "#0A66C2" }}
          >
            <Linkedin className="h-3.5 w-3.5" /> LinkedIn
          </button>
        </div>
        {copied && <p className="px-4 mt-2 text-xs text-brand">Link copied!</p>}

        {!badgeActive && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-brand/10 border border-brand/30 text-xs">
            Badge not active.{" "}
            <Link to="/upgrade" className="font-bold text-brand">
              Renew subscription
            </Link>{" "}
            to display the verified badge.
          </div>
        )}

        <section className="px-4 mt-6">
          <h2 className="font-bold mb-2">Products</h2>
          {companyProducts.length === 0 ? (
            <p className="text-xs text-muted-foreground">No products listed yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {companyProducts.map((p) => (
                <div key={p.id} className="rounded-lg bg-card border border-border p-2 text-center">
                  <div className="text-3xl">{p.image}</div>
                  <p className="text-[11px] font-medium mt-1 truncate">{p.name}</p>
                  <p className="text-[10px] text-brand font-bold">₦{p.price.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="px-4 mt-6">
          <h2 className="font-bold mb-2">Reviews</h2>
          <div className="space-y-2">
            {state.reviews.map((r) => (
              <div key={r.id} className="p-3 rounded-xl bg-card border border-border">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{r.author}</p>
                  <div className="flex items-center gap-0.5 text-xs">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${i < r.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{r.comment}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{r.time}</p>
              </div>
            ))}
          </div>
        </section>

        {company.partners.length > 0 && (
          <section className="px-4 mt-6 mb-8">
            <h2 className="font-bold mb-2">Partners</h2>
            <div className="flex flex-wrap gap-2">
              {company.partners.map((p, i) => (
                <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-muted">
                  {p}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users2; label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-card border border-border">
      <Icon className="h-4 w-4 mx-auto text-brand" />
      <p className="font-bold mt-1">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function avgRating(rs: { rating: number }[]) {
  if (!rs.length) return 0;
  return rs.reduce((a, b) => a + b.rating, 0) / rs.length;
}
