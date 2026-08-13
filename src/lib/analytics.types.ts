export type AnalyticsRole = "user" | "seller" | "job_seeker" | "employer" | "admin";

export type TimeRange = "today" | "7d" | "30d" | "90d" | "12m" | "all";

export interface UserAnalytics {
  listingsPosted: number;
  listingViews: number;
  listingSaves: number;
  listingInquiries: number;
  jobsApplied: number;
  jobsSaved: number;
  coursesEnrolled: number;
  coursesCompleted: number;
  certificatesEarned: number;
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

export interface JobSeekerAnalytics {
  totalApplications: number;
  savedJobs: number;
  shortlisted: number;
  interviews: number;
  selected: number;
  rejected: number;
  applicationsByStatus: Record<string, number>;
}

export interface EmployerAnalytics {
  totalJobs: number;
  activeJobs: number;
  totalViews: number;
  totalApplications: number;
  shortlisted: number;
  interviews: number;
  selected: number;
  hiringRate: number;
  jobPerformance: { id: string; title: string; views: number; applications: number }[];
}

export interface AdminAnalytics {
  totalUsers: number;
  activeUsers: number;
  totalListings: number;
  activeListings: number;
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  learnEnrollments: number;
  courseCompletions: number;
  certificatesIssued: number;
  growthChart: { date: string; users: number; listings: number }[];
}
