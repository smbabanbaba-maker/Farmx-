import {
  ALL_CATEGORIES,
  getMarketCategory,
  type MarketCategory,
  type MarketListing,
  type MarketReport,
} from "@/lib/market-types";
import {
  followSeller,
  getPublicMarketListing,
  getPublicMarketListings,
  getSavedListings,
  recordListingView,
  saveListing,
  unfollowSeller,
  unsaveListing,
  reportListing,
  recordSearch,
  removeSearch,
  clearSearchHistory,
  getRecentlyViewedListings,
} from "@/lib/market.functions";

export type { MarketListing } from "@/lib/market-types";
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
  mode: "production";
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

function createProductionRepository(): MarketRepository {
  const page = (query?: MarketQuery) => getPublicMarketListings({ data: query ?? {} });
  return {
    mode: "production",
    getListings: page,
    getListingById: (id) => getPublicMarketListing({ data: { id } }),
    getCategories: async () => ALL_CATEGORIES,
    getFeaturedListings: async () =>
      (await page({ filters: { featured: true }, pageSize: 12 })).listings,
    getSponsoredListings: async () =>
      (await page({ filters: { sponsored: true }, pageSize: 12 })).listings,
    getNearbyListings: async (state) =>
      (await page({ filters: state ? { state } : undefined, pageSize: 12 })).listings,
    getPopularListings: async () => (await page({ sort: "views", pageSize: 12 })).listings,
    getRelatedListings: async (listing, limit = 6) =>
      (
        await page({
          filters: { category: String(listing.metadata?.sourceCategoryId ?? listing.category) },
          pageSize: Math.min(50, limit + 1),
        })
      ).listings
        .filter((item) => item.id !== listing.id)
        .slice(0, limit),
    getSavedListings: () => getSavedListings(),
    getRecentlyViewed: () => getRecentlyViewedListings(),
    saveListing: (id) => saveListing({ data: { listingId: id } }).then(() => undefined),
    unsaveListing: (id) => unsaveListing({ data: { listingId: id } }).then(() => undefined),
    followSeller: (sellerName) => followSeller({ data: { sellerName } }).then(() => undefined),
    unfollowSeller: (sellerName) => unfollowSeller({ data: { sellerName } }).then(() => undefined),
    recordView: (id) => recordListingView({ data: { listingId: id } }).then(() => undefined),
    recordSearch: (query) => recordSearch({ data: { query } }).then(() => undefined),
    removeSearch: (query) => removeSearch({ data: { query } }).then(() => undefined),
    clearSearchHistory: () => clearSearchHistory().then(() => undefined),
    reportListing: (input) => reportListing({ data: input }),
    getSnapshot: async () => {
      const [listings, saved, viewed] = await Promise.all([
        page({ pageSize: 50 }),
        getSavedListings(),
        getRecentlyViewedListings(),
      ]);
      return {
        listings: listings.listings,
        categories: ALL_CATEGORIES,
        savedListingIds: saved.map((item) => item.id),
        followedSellerNames: [],
        recentSearches: [],
        recentlyViewedIds: viewed.map((item) => item.id),
        reports: [],
      };
    },
  };
}

let repositoryPromise: Promise<MarketRepository> | undefined;
export async function getMarketRepository(): Promise<MarketRepository> {
  repositoryPromise ??= Promise.resolve(createProductionRepository());
  return repositoryPromise;
}
export function getMarketRuntimeMode() {
  return "production" as const;
}
export { getMarketCategory };
