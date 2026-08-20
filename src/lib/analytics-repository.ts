import type { AdminAnalytics, SellerAnalytics, TimeRange, UserAnalytics } from "./analytics.types";
import { getMarketRepository } from "./market-repository";
import { getMyProfile } from "./profile.functions";

export class AnalyticsRepository {
  async getUserAnalytics(_userId: string | undefined, _range: TimeRange): Promise<UserAnalytics> {
    const marketRepo = await getMarketRepository();
    const [profileData, savedListings] = await Promise.all([
      getMyProfile(),
      marketRepo.getSavedListings(),
    ]);

    return {
      listingsPosted: profileData.stats.totalAds,
      listingViews: profileData.stats.totalAdViews,
      listingSaves: savedListings.length,
      listingInquiries: profileData.stats.buyerInquiries ?? 0,
    };
  }

  async getSellerAnalytics(
    _userId: string | undefined,
    _range: TimeRange,
  ): Promise<SellerAnalytics> {
    const profileData = await getMyProfile();
    const listings = profileData.activeListings;
    const totalViews = listings.reduce((sum, listing) => sum + listing.views, 0);
    const totalSaves = listings.reduce((sum, listing) => sum + listing.saves, 0);
    const totalShares = listings.reduce((sum, listing) => sum + listing.shares, 0);
    const totalInquiries = listings.reduce((sum, listing) => sum + listing.inquiries, 0);

    return {
      totalListings: profileData.stats.totalAds,
      activeListings: profileData.stats.activeAds,
      totalViews,
      totalSaves,
      totalShares,
      totalInquiries,
      topListings: [...listings]
        .sort((a, b) => b.views - a.views)
        .slice(0, 5)
        .map((listing) => ({
          id: listing.id,
          title: listing.title,
          views: listing.views,
          price: listing.price,
        })),
      viewsOverTime: [],
    };
  }

  async getAdminAnalytics(_range: TimeRange): Promise<AdminAnalytics> {
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalListings: 0,
      activeListings: 0,
      growthChart: [],
    };
  }
}

let instance: AnalyticsRepository | null = null;
export async function getAnalyticsRepository(): Promise<AnalyticsRepository> {
  if (!instance) instance = new AnalyticsRepository();
  return instance;
}
