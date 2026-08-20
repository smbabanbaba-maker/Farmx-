export type TimeRange = "today" | "7d" | "30d" | "90d" | "12m" | "all";

export interface UserAnalytics {
  listingsPosted: number;
  listingViews: number;
  listingSaves: number;
  listingInquiries: number;
}

export interface SellerAnalytics {
  totalListings: number;
  activeListings: number;
  totalViews: number;
  totalSaves: number;
  totalShares: number;
  totalInquiries: number;
  topListings: { id: string; title: string; views: number; price: number }[];
  viewsOverTime: { date: string; count: number }[];
}

export interface AdminAnalytics {
  totalUsers: number;
  activeUsers: number;
  totalListings: number;
  activeListings: number;
  growthChart: { date: string; users: number; listings: number }[];
}

export type AnalyticsRole = "seller" | "user" | "admin";
