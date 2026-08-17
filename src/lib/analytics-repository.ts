import type {
  UserAnalytics,
  SellerAnalytics,
  JobSeekerAnalytics,
  EmployerAnalytics,
  AdminAnalytics,
  TimeRange,
} from "./analytics.types";
import { getJobRepository } from "./job-repository";
import { getMarketRepository } from "./market-repository";
import { getMyProfile } from "./profile.functions";

export class AnalyticsRepository {
  async getUserAnalytics(_userId: string | undefined, _range: TimeRange): Promise<UserAnalytics> {
    const jobRepo = await getJobRepository();
    const marketRepo = await getMarketRepository();
    const [profileData, apps, savedJobs, savedListings] = await Promise.all([
      getMyProfile(),
      jobRepo.getApplications(),
      jobRepo.getSavedJobIds(),
      marketRepo.getSavedListings(),
    ]);

    return {
      listingsPosted: profileData.stats.totalAds,
      listingViews: profileData.stats.totalAdViews,
      listingSaves: savedListings.length,
      listingInquiries: profileData.stats.buyerInquiries ?? 0,
      jobsApplied: apps.length,
      jobsSaved: savedJobs.length,
      coursesEnrolled: 0,
      coursesCompleted: 0,
      certificatesEarned: 0,
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

  async getJobSeekerAnalytics(
    _userId: string | undefined,
    _range: TimeRange,
  ): Promise<JobSeekerAnalytics> {
    const jobRepo = await getJobRepository();
    const [apps, savedJobs] = await Promise.all([
      jobRepo.getApplications(),
      jobRepo.getSavedJobIds(),
    ]);
    const statusCounts: Record<string, number> = {
      Applied: 0,
      "Under Review": 0,
      Shortlisted: 0,
      Interview: 0,
      Selected: 0,
      Rejected: 0,
      Withdrawn: 0,
    };
    apps.forEach((application) => {
      statusCounts[application.status] = (statusCounts[application.status] ?? 0) + 1;
    });

    return {
      totalApplications: apps.length,
      savedJobs: savedJobs.length,
      shortlisted: statusCounts.Shortlisted,
      interviews: statusCounts.Interview,
      selected: statusCounts.Selected,
      rejected: statusCounts.Rejected,
      applicationsByStatus: statusCounts,
    };
  }

  async getEmployerAnalytics(
    _employerId: string | undefined,
    _range: TimeRange,
  ): Promise<EmployerAnalytics> {
    const jobRepo = await getJobRepository();
    const [jobs, applications] = await Promise.all([
      jobRepo.getJobs(),
      jobRepo.getApplications(undefined, undefined),
    ]);
    const shortlisted = applications.filter(
      (application) => application.status === "Shortlisted",
    ).length;
    const interviews = applications.filter(
      (application) => application.status === "Interview",
    ).length;
    const selected = applications.filter((application) => application.status === "Selected").length;

    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter((job) => job.status === "published").length,
      totalViews: jobs.reduce((sum, job) => sum + job.stats.views, 0),
      totalApplications: applications.length,
      shortlisted,
      interviews,
      selected,
      hiringRate: applications.length > 0 ? Math.round((selected / applications.length) * 100) : 0,
      jobPerformance: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        views: job.stats.views,
        applications: job.stats.applications,
      })),
    };
  }

  async getAdminAnalytics(_range: TimeRange): Promise<AdminAnalytics> {
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalListings: 0,
      activeListings: 0,
      totalJobs: 0,
      activeJobs: 0,
      totalApplications: 0,
      learnEnrollments: 0,
      courseCompletions: 0,
      certificatesIssued: 0,
      growthChart: [],
    };
  }
}

let instance: AnalyticsRepository | null = null;
export async function getAnalyticsRepository(): Promise<AnalyticsRepository> {
  if (!instance) instance = new AnalyticsRepository();
  return instance;
}
