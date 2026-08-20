import type { MarketCategory, MarketListing } from "@/lib/market-types";

const FALLBACK_SITE_URL = "https://goall26.example";
const BRAND_LOGO_PATH = "/goall26-logo.png";

type JsonLd = Record<string, unknown>;

type SeoHeadInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article" | "product";
  keywords?: string[];
  noindex?: boolean;
  jsonLd?: JsonLd | JsonLd[];
};

function configuredSiteUrl() {
  const configured = import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined;
  return (configured || FALLBACK_SITE_URL).replace(/\/$/, "");
}

export function absoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${configuredSiteUrl()}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function publicSiteUrl() {
  return configuredSiteUrl();
}

export function publicIndexingEnabled(section?: string) {
  if (import.meta.env.VITE_PUBLIC_INDEXING !== "true") return false;
  if (!section) return true;
  const key = `VITE_PUBLIC_INDEXING_${section.toUpperCase()}`;
  return (import.meta.env[key] as string | undefined) !== "false";
}

export function safePublicImageUrl(value?: string) {
  if (!value) return absoluteUrl(BRAND_LOGO_PATH);
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return absoluteUrl(value);
  return absoluteUrl(BRAND_LOGO_PATH);
}

export function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateDescription(value: string, maxLength = 158) {
  const clean = stripHtml(value);
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trimEnd()}…`;
}

function compactJsonLd(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(compactJsonLd);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined && entry !== null && entry !== "")
      .map(([key, entry]) => [key, compactJsonLd(entry)]),
  );
}

export function createSeoHead(input: SeoHeadInput) {
  const canonical = absoluteUrl(input.path);
  const image = safePublicImageUrl(input.image);
  const noindex = input.noindex ?? !publicIndexingEnabled();
  const robots = noindex ? "noindex,follow" : "index,follow";
  const meta = [
    { title: input.title },
    { name: "description", content: input.description },
    { name: "robots", content: robots },
    ...(input.keywords?.length ? [{ name: "keywords", content: input.keywords.join(", ") }] : []),
    { property: "og:title", content: input.title },
    { property: "og:description", content: input.description },
    { property: "og:url", content: canonical },
    { property: "og:type", content: input.type ?? "website" },
    { property: "og:site_name", content: "Goall26" },
    { property: "og:locale", content: "en_NG" },
    { property: "og:image", content: image },
    { property: "og:image:alt", content: input.title },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: input.title },
    { name: "twitter:description", content: input.description },
    { name: "twitter:image", content: image },
  ];
  const links = [{ rel: "canonical", href: canonical }];
  const jsonLdEntries = input.jsonLd
    ? Array.isArray(input.jsonLd)
      ? input.jsonLd
      : [input.jsonLd]
    : [];
  const scripts = jsonLdEntries.map((entry) => ({
    type: "application/ld+json",
    children: JSON.stringify(compactJsonLd(entry)),
  }));
  return { meta, links, scripts };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Goall26",
    url: publicSiteUrl(),
    logo: absoluteUrl(BRAND_LOGO_PATH),
    sameAs: [],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Goall26",
    url: publicSiteUrl(),
    potentialAction: {
      "@type": "SearchAction",
      target: `${publicSiteUrl()}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function productJsonLd(listing: MarketListing) {
  const price = listing.price;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: truncateDescription(listing.description),
    image: listing.images.map(safePublicImageUrl),
    category: listing.category,
    sku: listing.id,
    brand: listing.metadata?.brand,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/product/${encodeURIComponent(listing.id)}`),
      priceCurrency: "NGN",
      price: price ?? undefined,
      availability:
        listing.availability === "available" || listing.availability === "in_stock"
          ? "https://schema.org/InStock"
          : "https://schema.org/PreOrder",
      itemCondition:
        listing.condition === "new"
          ? "https://schema.org/NewCondition"
          : "https://schema.org/UsedCondition",
      seller: {
        "@type": listing.seller.type === "business" ? "Organization" : "Person",
        name: listing.seller.name,
      },
    },
    aggregateRating:
      listing.seller.reviews > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: listing.seller.rating,
            reviewCount: listing.seller.reviews,
          }
        : undefined,
  };
}

export function publicProfileJsonLd(profile: {
  fullName: string;
  username: string;
  role?: string;
  bio?: string;
  state?: string;
  location?: string;
  photoUrl?: string | null;
  verification?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": profile.role?.toLowerCase().includes("business") ? "Organization" : "Person",
    name: profile.fullName,
    url: absoluteUrl(`/u/${encodeURIComponent(profile.username)}`),
    description: profile.bio ? truncateDescription(profile.bio) : undefined,
    image: profile.photoUrl ? safePublicImageUrl(profile.photoUrl) : undefined,
    jobTitle: profile.role,
    address:
      profile.state || profile.location
        ? {
            "@type": "PostalAddress",
            addressLocality: profile.location,
            addressRegion: profile.state,
            addressCountry: "NG",
          }
        : undefined,
  };
}

export function categoryCollectionJsonLd(category: MarketCategory, listings: MarketListing[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.name} on Goall26`,
    description: truncateDescription(category.description),
    url: absoluteUrl(`/market/category/${encodeURIComponent(category.id)}`),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: listings.length,
      itemListElement: listings.slice(0, 20).map((listing, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/product/${encodeURIComponent(listing.id)}`),
        name: listing.title,
      })),
    },
  };
}
