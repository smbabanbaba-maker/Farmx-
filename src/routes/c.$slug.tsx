import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Building2, MapPin, MessageCircle, Share2 } from "lucide-react";
import { ListingImage } from "@/components/ListingImage";
import { getPublicProfile } from "@/lib/profile.functions";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/c/$slug")({
  loader: async ({ params }) => {
    try {
      return await getPublicProfile({ data: { username: params.slug } });
    } catch {
      return null;
    }
  },
  head: ({ params, loaderData }) => {
    const profile = loaderData?.profile;
    const name = profile?.business?.name || profile?.fullName || params.slug;
    return createSeoHead({
      title: `${name} — Goall26 Company`,
      description:
        profile?.business?.description ||
        profile?.bio ||
        `Public Goall26 company profile for ${name}.`,
      path: `/c/${encodeURIComponent(params.slug)}`,
      type: "website",
      noindex: !profile,
    });
  },
  component: MiniSite,
});

function MiniSite() {
  const data = Route.useLoaderData();
  const { slug } = Route.useParams();
  if (!data) throw notFound();

  const { profile, listings, stats } = data;
  const business = profile.business;
  const name = business?.name || profile.fullName;
  const description = business?.description || profile.bio;
  const logoKey = business?.logoKey || profile.photoKey;
  const location =
    [business?.lga, business?.state || profile.state].filter(Boolean).join(", ") ||
    profile.location;
  const services = business?.services ?? [];
  const verified = profile.verification === "approved";
  const url = typeof window !== "undefined" ? window.location.href : `/c/${slug}`;

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: name, text: description || name, url });
      return;
    }
    await navigator.clipboard?.writeText(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md pb-10">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <Link
            to="/market"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Market
          </Link>
          <button
            type="button"
            onClick={() => void share()}
            className="rounded-full p-2 hover:bg-accent"
            aria-label="Share company"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        <div className="relative">
          <div className="h-32 bg-gradient-to-br from-red-100 via-white to-red-200">
            {business?.coverKey && (
              <ListingImage
                src={business.coverKey}
                alt={`${name} cover`}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="-mt-10 px-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-background bg-white shadow-lg">
              {logoKey ? (
                <ListingImage
                  src={logoKey}
                  alt={`${name} logo`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 className="h-9 w-9 text-brand" />
              )}
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <h1 className="text-xl font-bold">{name}</h1>
              {verified && <BadgeCheck className="h-5 w-5 text-brand" aria-label="Verified" />}
            </div>
            <p className="text-xs text-muted-foreground">
              {business?.businessType || business?.category || profile.role}
            </p>
            {location && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {location}
              </p>
            )}
            {description && <p className="mt-3 text-sm leading-6">{description}</p>}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 px-4 text-center">
          <Stat label="Active listings" value={String(stats.activeAds)} />
          <Stat label="Followers" value={String(stats.followers)} />
          <Stat label="Verification" value={verified ? "Verified" : "Not verified"} />
        </div>

        <div className="mt-4 flex gap-2 px-4">
          <Link
            to="/messages"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand py-3 text-xs font-bold text-brand-foreground"
          >
            <MessageCircle className="h-4 w-4" /> Message
          </Link>
          <button
            type="button"
            onClick={() => void share()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3 text-xs font-bold"
          >
            <Share2 className="h-4 w-4" /> Share
          </button>
        </div>

        {services.length > 0 && (
          <section className="mt-7 px-4">
            <h2 className="mb-2 font-bold">Services</h2>
            <div className="flex flex-wrap gap-2">
              {services.map((service) => (
                <span key={service} className="rounded-full bg-muted px-3 py-1.5 text-xs">
                  {service}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="mt-7 px-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">Active listings</h2>
            <span className="text-xs text-muted-foreground">{listings.length}</span>
          </div>
          {listings.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              No active listings yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {listings.map((listing) => (
                <Link
                  key={listing.id}
                  to="/product/$id"
                  params={{ id: listing.id }}
                  className="overflow-hidden rounded-xl border border-border bg-card"
                >
                  <ListingImage
                    src={listing.images[0]}
                    alt={listing.title}
                    className="h-32 w-full object-cover"
                  />
                  <div className="p-3">
                    <p className="truncate text-xs font-bold">{listing.title}</p>
                    <p className="mt-1 text-sm font-black text-brand">
                      ₦{listing.price.toLocaleString()}
                    </p>
                    <p className="mt-1 truncate text-[10px] text-muted-foreground">
                      {listing.location || listing.state}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="font-bold">{value}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
