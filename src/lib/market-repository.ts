import {
  ALL_CATEGORIES,
  getMarketCategory,
  getMarketListing,
  marketSeedListings,
  type MarketCategory,
  type MarketListing,
  type MarketReport,
} from "@/lib/market-dev-data";
import { getPublicMarketListing, getPublicMarketListings } from "@/lib/market.functions";

export type { MarketListing } from "@/lib/market-dev-data";

export type MarketSort =
  | "relevant"
  | "newest"
  | "oldest"
  | "price_low"
  | "price_high"
  | "views"
  | "saves"
  | "inquiries"
  | "nearest";

export type MarketFilters = {
  category?: string;
  subcategory?: string;
  state?: string;
  city?: string;
  sellerType?: "individual" | "business";
  verification?: "verified_seller" | "verified_business";
  condition?: string;
  availability?: "available" | "limited" | "unavailable";
  priceMin?: number;
  priceMax?: number;
  priceType?: "fixed" | "negotiable";
  featured?: boolean;
  sponsored?: boolean;
  radiusKm?: number;
};

export type MarketQuery = {
  query?: string;
  filters?: MarketFilters;
  sort?: MarketSort;
  page?: number;
  pageSize?: number;
};

export type MarketPage = {
  listings: MarketListing[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type MarketSnapshot = {
  listings: MarketListing[];
  categories: MarketCategory[];
  savedListingIds: string[];
  followedSellerNames: string[];
  recentSearches: string[];
  recentlyViewedIds: string[];
  reports: MarketReport[];
};

export type MarketRepository = {
  mode: "preview" | "production";
  getListings: (query?: MarketQuery) => Promise<MarketPage>;
  getListingById: (id: string) => Promise<MarketListing | null>;
  getCategories: () => Promise<MarketCategory[]>;
  getFeaturedListings: () => Promise<MarketListing[]>;
  getSponsoredListings: () => Promise<MarketListing[]>;
  getNearbyListings: (state?: string) => Promise<MarketListing[]>;
  getPopularListings: () => Promise<MarketListing[]>;
  getRelatedListings: (listing: MarketListing, limit?: number) => Promise<MarketListing[]>;
  getSavedListings: () => Promise<MarketListing[]>;
  getRecentlyViewed: () => Promise<MarketListing[]>;
  saveListing: (id: string) => Promise<void>;
  unsaveListing: (id: string) => Promise<void>;
  followSeller: (sellerName: string) => Promise<void>;
  unfollowSeller: (sellerName: string) => Promise<void>;
  recordView: (id: string) => Promise<void>;
  recordSearch: (query: string) => Promise<void>;
  removeSearch: (query: string) => Promise<void>;
  clearSearchHistory: () => Promise<void>;
  reportListing: (
    input: Omit<MarketReport, "id" | "status" | "createdAt">,
  ) => Promise<MarketReport>;
  getSnapshot: () => Promise<MarketSnapshot>;
};

const STORAGE_KEY = "farmx-market-preview-v1";

type LocalMarketState = Pick<
  MarketSnapshot,
  "savedListingIds" | "followedSellerNames" | "recentSearches" | "recentlyViewedIds" | "reports"
>;

const emptyLocalState: LocalMarketState = {
  savedListingIds: [],
  followedSellerNames: [],
  recentSearches: [],
  recentlyViewedIds: [],
  reports: [],
};

function readLocalState(): LocalMarketState {
  if (typeof window === "undefined") return emptyLocalState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyLocalState;
    const parsed = JSON.parse(raw) as Partial<LocalMarketState>;
    return {
      savedListingIds: Array.isArray(parsed.savedListingIds) ? parsed.savedListingIds : [],
      followedSellerNames: Array.isArray(parsed.followedSellerNames)
        ? parsed.followedSellerNames
        : [],
      recentSearches: Array.isArray(parsed.recentSearches) ? parsed.recentSearches : [],
      recentlyViewedIds: Array.isArray(parsed.recentlyViewedIds) ? parsed.recentlyViewedIds : [],
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
    };
  } catch {
    return emptyLocalState;
  }
}

function writeLocalState(next: LocalMarketState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Preview persistence is best effort; the production repository persists server-side.
  }
}

function applyQuery(listings: MarketListing[], query: MarketQuery = {}) {
  const search = query.query?.trim().toLowerCase() ?? "";
  const filters = query.filters ?? {};
  const filtered = listings.filter((listing) => {
    const searchable = [
      listing.title,
      listing.description,
      listing.category,
      listing.subcategory,
      listing.state,
      listing.city,
      listing.seller.name,
      ...listing.tags,
    ]
      .join(" ")
      .toLowerCase();
    if (search && !searchable.includes(search)) return false;
    if (filters.category && listing.category !== filters.category) return false;
    if (filters.subcategory && listing.subcategory !== filters.subcategory) return false;
    if (filters.state && listing.state !== filters.state) return false;
    if (filters.city && listing.city !== filters.city) return false;
    if (filters.sellerType && listing.seller.type !== filters.sellerType) return false;
    if (
      filters.verification &&
      !["verified_seller", "verified_business"].includes(listing.seller.verification)
    )
      return false;
    if (
      filters.verification === "verified_business" &&
      listing.seller.verification !== "verified_business"
    )
      return false;
    if (filters.condition && listing.condition !== filters.condition) return false;
    if (filters.availability && listing.availability !== filters.availability) return false;
    if (filters.priceType && listing.priceType !== filters.priceType) return false;
    if (filters.featured !== undefined && listing.featured !== filters.featured) return false;
    if (filters.sponsored !== undefined && listing.sponsored !== filters.sponsored) return false;
    if (
      filters.priceMin !== undefined &&
      (listing.price === null || listing.price < filters.priceMin)
    )
      return false;
    if (
      filters.priceMax !== undefined &&
      (listing.price === null || listing.price > filters.priceMax)
    )
      return false;
    return listing.status === "published";
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (query.sort) {
      case "oldest":
        return a.createdAt.localeCompare(b.createdAt);
      case "price_low":
        return (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY);
      case "price_high":
        return (b.price ?? -1) - (a.price ?? -1);
      case "views":
        return b.stats.views - a.stats.views;
      case "saves":
        return b.stats.saves - a.stats.saves;
      case "inquiries":
        return b.stats.inquiries - a.stats.inquiries;
      case "nearest":
        return a.state.localeCompare(b.state);
      case "relevant":
        return (
          Number(b.featured) - Number(a.featured) ||
          Number(b.sponsored) - Number(a.sponsored) ||
          b.stats.views - a.stats.views
        );
      case "newest":
      default:
        return b.createdAt.localeCompare(a.createdAt);
    }
  });
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 12));
  const start = (page - 1) * pageSize;
  return {
    listings: sorted.slice(start, start + pageSize),
    total: sorted.length,
    page,
    pageSize,
    hasMore: start + pageSize < sorted.length,
  };
}

function createPreviewRepository(): MarketRepository {
  const list = () => [...marketSeedListings];
  const updateLocal = (mutate: (state: LocalMarketState) => LocalMarketState) => {
    const next = mutate(readLocalState());
    writeLocalState(next);
    return next;
  };
  return {
    mode: "preview",
    getListings: async (query) => applyQuery(list(), query),
    getListingById: async (id) => getMarketListing(id) ?? null,
    getCategories: async () => ALL_CATEGORIES,
    getFeaturedListings: async () =>
      list().filter((listing) => listing.featured && listing.status === "published"),
    getSponsoredListings: async () =>
      list().filter((listing) => listing.sponsored && listing.status === "published"),
    getNearbyListings: async (state) =>
      list()
        .filter((listing) => listing.status === "published" && (!state || listing.state === state))
        .slice(0, 12),
    getPopularListings: async () =>
      [...list()]
        .filter((listing) => listing.status === "published")
        .sort((a, b) => b.stats.views - a.stats.views)
        .slice(0, 12),
    getRelatedListings: async (listing, limit = 6) =>
      list()
        .filter(
          (item) =>
            item.id !== listing.id &&
            item.status === "published" &&
            (item.category === listing.category ||
              item.state === listing.state ||
              item.tags.some((tag) => listing.tags.includes(tag))),
        )
        .sort((a, b) => b.stats.views - a.stats.views)
        .slice(0, limit),
    getSavedListings: async () => {
      const state = readLocalState();
      return list().filter((listing) => state.savedListingIds.includes(listing.id));
    },
    getRecentlyViewed: async () => {
      const state = readLocalState();
      return state.recentlyViewedIds
        .map((id) => getMarketListing(id))
        .filter((listing): listing is MarketListing => Boolean(listing));
    },
    saveListing: async (id) => {
      updateLocal((state) => ({
        ...state,
        savedListingIds: [...new Set([...state.savedListingIds, id])],
      }));
    },
    unsaveListing: async (id) => {
      updateLocal((state) => ({
        ...state,
        savedListingIds: state.savedListingIds.filter((value) => value !== id),
      }));
    },
    followSeller: async (sellerName) => {
      updateLocal((state) => ({
        ...state,
        followedSellerNames: [...new Set([...state.followedSellerNames, sellerName])],
      }));
    },
    unfollowSeller: async (sellerName) => {
      updateLocal((state) => ({
        ...state,
        followedSellerNames: state.followedSellerNames.filter((value) => value !== sellerName),
      }));
    },
    recordView: async (id) => {
      updateLocal((state) => ({
        ...state,
        recentlyViewedIds: [id, ...state.recentlyViewedIds.filter((value) => value !== id)].slice(
          0,
          20,
        ),
      }));
    },
    recordSearch: async (query) => {
      const value = query.trim();
      if (!value) return;
      updateLocal((state) => ({
        ...state,
        recentSearches: [
          value,
          ...state.recentSearches.filter((item) => item.toLowerCase() !== value.toLowerCase()),
        ].slice(0, 10),
      }));
    },
    removeSearch: async (query) => {
      updateLocal((state) => ({
        ...state,
        recentSearches: state.recentSearches.filter((item) => item !== query),
      }));
    },
    clearSearchHistory: async () => {
      updateLocal((state) => ({ ...state, recentSearches: [] }));
    },
    reportListing: async (input) => {
      const report: MarketReport = {
        ...input,
        id: `report-${Date.now()}`,
        status: "open",
        createdAt: new Date().toISOString(),
      };
      updateLocal((state) => ({ ...state, reports: [report, ...state.reports] }));
      return report;
    },
    getSnapshot: async () => {
      const state = readLocalState();
      return { listings: list(), categories: ALL_CATEGORIES, ...state };
    },
  };
}

function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");
}

function queryString(query: MarketQuery = {}) {
  const params = new URLSearchParams();
  if (query.query) params.set("q", query.query);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.sort) params.set("sort", query.sort);
  Object.entries(query.filters ?? {}).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  return params.toString();
}

function createProductionRepository(apiBaseUrl: string): MarketRepository {
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!response.ok) throw new Error(`Market request failed (${response.status})`);
    return response.json() as Promise<T>;
  };
  const action = (path: string, body: unknown) =>
    request<void>(path, { method: "POST", body: JSON.stringify(body) });
  return {
    mode: "production",
    // Production marketplace reads directly from the real DynamoDB ListingsTable.
    // This avoids depending on an external /market REST service that is not part of FarmX.
    getListings: (query) => getPublicMarketListings({ data: query ?? {} }),
    getListingById: (id) => getPublicMarketListing({ data: { id } }),
    getCategories: async () => ALL_CATEGORIES,
    getFeaturedListings: async () =>
      (
        await getPublicMarketListings({
          data: { filters: { featured: true }, pageSize: 12 },
        })
      ).listings,
    getSponsoredListings: async () =>
      (
        await getPublicMarketListings({
          data: { filters: { sponsored: true }, pageSize: 12 },
        })
      ).listings,
    getNearbyListings: async (state) =>
      (
        await getPublicMarketListings({
          data: { filters: state ? { state } : undefined, pageSize: 12 },
        })
      ).listings,
    getPopularListings: async () =>
      (
        await getPublicMarketListings({
          data: { sort: "views", pageSize: 12 },
        })
      ).listings,
    getRelatedListings: async (listing, limit = 6) => {
      const result = await getPublicMarketListings({
        data: {
          filters: {
            category: String(listing.metadata?.sourceCategoryId ?? listing.category),
          },
          pageSize: Math.min(50, limit + 1),
        },
      });
      return result.listings
        .filter((item: MarketListing) => item.id !== listing.id)
        .slice(0, limit);
    },
    getSavedListings: () => request<MarketListing[]>("/market/saved"),
    getRecentlyViewed: () => request<MarketListing[]>("/market/recently-viewed"),
    saveListing: (id) => action("/market/saved", { listingId: id }),
    unsaveListing: (id) => action("/market/saved/remove", { listingId: id }),
    followSeller: (sellerName) => action("/market/followers", { sellerName }),
    unfollowSeller: (sellerName) => action("/market/followers/remove", { sellerName }),
    recordView: (id) => action("/market/views", { listingId: id }),
    recordSearch: (query) => action("/market/search-history", { query }),
    removeSearch: (query) => action("/market/search-history/remove", { query }),
    clearSearchHistory: () => action("/market/search-history/clear", {}),
    reportListing: (input) =>
      request<MarketReport>("/market/reports", { method: "POST", body: JSON.stringify(input) }),
    getSnapshot: () => request<MarketSnapshot>("/market/snapshot"),
  };
}

let repositoryPromise: Promise<MarketRepository> | undefined;

export async function getMarketRepository(): Promise<MarketRepository> {
  if (!repositoryPromise) {
    const apiBaseUrl = getApiBaseUrl();
    const isProductionBuild = import.meta.env.PROD;
    const preview =
      !isProductionBuild && (import.meta.env.VITE_MARKET_PREVIEW !== "false" || !apiBaseUrl);
    repositoryPromise = Promise.resolve(
      preview ? createPreviewRepository() : createProductionRepository(apiBaseUrl ?? ""),
    );
  }
  return repositoryPromise;
}

export function getMarketRuntimeMode() {
  const isProductionBuild = import.meta.env.PROD;
  return isProductionBuild ||
    (import.meta.env.VITE_MARKET_PREVIEW === "false" && Boolean(getApiBaseUrl()))
    ? "production"
    : "preview";
}

export { getMarketCategory };
