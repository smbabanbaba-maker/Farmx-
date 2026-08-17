import { getCommunityRepository, type CommunityRepository } from "@/lib/community-repository";
import {
  getMarketRepository,
  type MarketFilters,
  type MarketRepository,
  type MarketSort,
} from "@/lib/market-repository";
import type { MarketListing } from "@/lib/market-types";
import type { CommunityPost } from "@/lib/community.types";
import type { JobPost } from "@/lib/job.types";
import { getJobRepository } from "@/lib/job-repository";

export type GlobalSearchTab = "all" | "listings" | "services" | "businesses" | "jobs" | "community";

export type GlobalSearchQuery = {
  query: string;
  tab?: GlobalSearchTab;
  filters?: MarketFilters;
  sort?: MarketSort;
  page?: number;
  pageSize?: number;
};

export type BusinessSearchResult = {
  username: string;
  name: string;
  location: string;
  verification: MarketListing["seller"]["verification"];
  rating: number;
  reviews: number;
  activeListings: number;
  photo: string;
};

export type JobSearchResult = JobPost;

export type GlobalSearchResult = {
  query: string;
  listings: MarketListing[];
  services: MarketListing[];
  businesses: BusinessSearchResult[];
  jobs: JobSearchResult[];
  community: CommunityPost[];
  counts: Record<GlobalSearchTab, number>;
  availableTabs: GlobalSearchTab[];
  hasMore: boolean;
};

export type SearchSuggestion = {
  label: string;
  type: "listing" | "business" | "community" | "recent";
  listingId?: string;
  postId?: string;
};

function isServiceListing(listing: MarketListing) {
  const text = `${listing.category} ${listing.subcategory} ${listing.title}`.toLowerCase();
  return text.includes("service") || text.includes("transport") || text.includes("repair");
}

function businessResults(listings: MarketListing[]) {
  const byUsername = new Map<string, BusinessSearchResult>();
  listings.forEach((listing) => {
    if (listing.seller.type !== "business") return;
    const seller = listing.seller;
    if (!byUsername.has(seller.username)) {
      byUsername.set(seller.username, {
        username: seller.username,
        name: seller.name,
        location: seller.location,
        verification: seller.verification,
        rating: seller.rating,
        reviews: seller.reviews,
        activeListings: seller.activeListings,
        photo: seller.photo,
      });
    }
  });
  return [...byUsername.values()];
}

export async function searchGlobal(input: GlobalSearchQuery): Promise<GlobalSearchResult> {
  const market: MarketRepository = await getMarketRepository();
  const community: CommunityRepository = await getCommunityRepository();
  const pageSize = Math.min(24, Math.max(1, input.pageSize ?? 12));
  const page = Math.max(1, input.page ?? 1);
  const marketPage = await market.getListings({
    query: input.query,
    filters: input.filters,
    sort: input.sort ?? "relevant",
    page,
    pageSize,
  });
  const services = marketPage.listings.filter(isServiceListing);
  const businesses = businessResults(marketPage.listings);
  const communityPage =
    input.tab === "listings" ||
    input.tab === "services" ||
    input.tab === "businesses" ||
    input.tab === "jobs"
      ? { posts: [], hasMore: false }
      : await community.getFeed({ tab: "latest", search: input.query, limit: pageSize });
  const jobRepo = await getJobRepository();
  const jobsList = await jobRepo.getJobs({
    search: input.query,
    state: input.filters?.state,
  });
  const counts: Record<GlobalSearchTab, number> = {
    all: marketPage.total + communityPage.posts.length + jobsList.length,
    listings: marketPage.total,
    services: services.length,
    businesses: businesses.length,
    jobs: jobsList.length,
    community: communityPage.posts.length,
  };
  const availableTabs: GlobalSearchTab[] = ["all"];
  (["listings", "services", "businesses", "jobs", "community"] as const).forEach((tab) => {
    if (counts[tab] > 0) availableTabs.push(tab);
  });
  return {
    query: input.query,
    listings:
      input.tab === "services"
        ? []
        : input.tab === "businesses" || input.tab === "jobs" || input.tab === "community"
          ? []
          : marketPage.listings,
    services: input.tab === "services" || input.tab === "all" ? services : [],
    businesses: input.tab === "businesses" || input.tab === "all" ? businesses : [],
    jobs: input.tab === "jobs" || input.tab === "all" ? jobsList : [],
    community: input.tab === "community" || input.tab === "all" ? communityPage.posts : [],
    counts,
    availableTabs,
    hasMore: marketPage.hasMore || communityPage.hasMore,
  };
}

export async function getSearchSuggestions(query: string): Promise<SearchSuggestion[]> {
  const market = await getMarketRepository();
  const snapshot = await market.getSnapshot();
  const value = query.trim().toLowerCase();
  const recent = snapshot.recentSearches
    .filter((item) => !value || item.toLowerCase().includes(value))
    .slice(0, 5)
    .map((label) => ({ label, type: "recent" as const }));
  if (!value) return recent;
  const listingPage = await market.getListings({ query, sort: "relevant", pageSize: 6 });
  const listingSuggestions = listingPage.listings.map((listing) => ({
    label: listing.title,
    type: "listing" as const,
    listingId: listing.id,
  }));
  const businessSuggestions = businessResults(listingPage.listings).map((business) => ({
    label: business.name,
    type: "business" as const,
  }));
  const community = await getCommunityRepository();
  const communityPage = await community.getFeed({ tab: "latest", search: query, limit: 4 });
  const communitySuggestions = communityPage.posts.slice(0, 2).map((post) => ({
    label: post.content.slice(0, 72),
    type: "community" as const,
    postId: post.id,
  }));
  const seen = new Set<string>();
  return [...listingSuggestions, ...businessSuggestions, ...communitySuggestions]
    .filter((item) => {
      const key = item.label.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

export async function getRecentSearches() {
  const market = await getMarketRepository();
  return (await market.getSnapshot()).recentSearches;
}

export async function recordGlobalSearch(query: string) {
  const market = await getMarketRepository();
  await market.recordSearch(query);
}

export async function clearGlobalSearches() {
  const market = await getMarketRepository();
  await market.clearSearchHistory();
}

export function getSearchResultCount(result: GlobalSearchResult, tab: GlobalSearchTab) {
  return result.counts[tab];
}
