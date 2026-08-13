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

export class AnalyticsRepository {
  async getUserAnalytics(userId: string, _range: TimeRange): Promise<UserAnalytics> {
    const jobRepo = await getJobRepository();
    const marketRepo = await getMarketRepository();
    const [apps, savedJobs, savedListings] = await Promise.all([
      jobRepo.getApplications(userId),
      jobRepo.getSavedJobIds(userId),
      marketRepo.getSavedListings(),
    ]);

    return {
      listingsPosted: 0,
      listingViews: 0,
      listingSaves: savedListings.length,
      listingInquiries: 0,
      jobsApplied: apps.length,
      jobsSaved: savedJobs.length,
      coursesEnrolled: 0,
      coursesCompleted: 0,
      certificatesEarned: 0,
    };
  }

  async getSellerAnalytics(_userId: string, _range: TimeRange): Promise<SellerAnalytics> {
    const marketRepo = await getMarketRepository();
    const page = await marketRepo.getListings({ page: 1, pageSize: 50, sort: "views" });
    const listings = page.listings;
    const totalViews = listings.reduce((sum, listing) => sum + listing.stats.views, 0);
    const totalSaves = listings.reduce((sum, listing) => sum + listing.stats.saves, 0);
    const totalShares = listings.reduce((sum, listing) => sum + listing.stats.shares, 0);
    const totalInquiries = listings.reduce((sum, listing) => sum + listing.stats.inquiries, 0);

    return {
      totalListings: page.total,
      activeListings: listings.filter((listing) => listing.status === "published").length,
      totalViews,
      totalSaves,
      totalShares,
      totalInquiries,
      topListings: listings.slice(0, 5).map((listing) => ({
        id: listing.id,
        title: listing.title,
        views: listing.stats.views,
        price: listing.price ?? 0,
      })),
      viewsOverTime: [],
    };
  }

  async getJobSeekerAnalytics(userId: string, _range: TimeRange): Promise<JobSeekerAnalytics> {
    const jobRepo = await getJobRepository();
    const [apps, savedJobs] = await Promise.all([
      jobRepo.getApplications(userId),
      jobRepo.getSavedJobIds(userId),
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

  async getEmployerAnalytics(employerId: string, _range: TimeRange): Promise<EmployerAnalytics> {
    const jobRepo = await getJobRepository();
    const jobs = await jobRepo.getJobs();
    const employerJobs = jobs.filter((job) => job.employerId === employerId);
    const applications = await jobRepo.getApplications(undefined, employerId);
    const shortlisted = applications.filter(
      (application) => application.status === "Shortlisted",
    ).length;
    const interviews = applications.filter(
      (application) => application.status === "Interview",
    ).length;
    const selected = applications.filter((application) => application.status === "Selected").length;

    return {
      totalJobs: employerJobs.length,
      activeJobs: employerJobs.filter((job) => job.status === "published").length,
      totalViews: employerJobs.reduce((sum, job) => sum + job.stats.views, 0),
      totalApplications: applications.length,
      shortlisted,
      interviews,
      selected,
      hiringRate: applications.length > 0 ? Math.round((selected / applications.length) * 100) : 0,
      jobPerformance: employerJobs.map((job) => ({
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
