import type { UserAnalytics, SellerAnalytics, JobSeekerAnalytics, EmployerAnalytics, AdminAnalytics, TimeRange } from "./analytics.types";
import { getJobRepository } from "./job-repository";

export class AnalyticsRepository {
  async getUserAnalytics(_userId: string, _range: TimeRange): Promise<UserAnalytics> {
    const jobRepo = await getJobRepository();
    const apps = await jobRepo.getApplications(_userId);
    const savedJobs = await jobRepo.getSavedJobIds(_userId);

    return {
      listingsPosted: 3,
      listingViews: 412,
      listingSaves: 28,
      listingInquiries: 9,
      jobsApplied: apps.length,
      jobsSaved: savedJobs.length,
      coursesEnrolled: 2,
      coursesCompleted: 1,
      certificatesEarned: 1,
    };
  }

  async getSellerAnalytics(_userId: string, _range: TimeRange): Promise<SellerAnalytics> {
    return {
      totalListings: 5,
      activeListings: 4,
      totalViews: 1420,
      totalSaves: 95,
      totalShares: 34,
      totalInquiries: 22,
      topListings: [
        { id: "1", title: "Premium Organic Maize (50kg Bag)", views: 520, price: 35000 },
        { id: "2", title: "Fresh Hybrid Tomatoes (Basket)", views: 410, price: 18000 },
        { id: "3", title: "Healthy Broiler Chickens (Live)", views: 320, price: 6500 },
      ],
      viewsOverTime: [
        { date: "Mon", count: 180 },
        { date: "Tue", count: 210 },
        { date: "Wed", count: 195 },
        { date: "Thu", count: 260 },
        { date: "Fri", count: 310 },
        { date: "Sat", count: 280 },
        { date: "Sun", count: 345 },
      ],
    };
  }

  async getJobSeekerAnalytics(userId: string, _range: TimeRange): Promise<JobSeekerAnalytics> {
    const jobRepo = await getJobRepository();
    const apps = await jobRepo.getApplications(userId);
    const savedJobs = await jobRepo.getSavedJobIds(userId);

    const statusCounts: Record<string, number> = {
      Applied: 0,
      "Under Review": 0,
      Shortlisted: 0,
      Interview: 0,
      Selected: 0,
      Rejected: 0,
      Withdrawn: 0,
    };

    apps.forEach((a) => {
      if (statusCounts[a.status] !== undefined) statusCounts[a.status]++;
    });

    return {
      totalApplications: apps.length,
      savedJobs: savedJobs.length,
      shortlisted: statusCounts["Shortlisted"],
      interviews: statusCounts["Interview"],
      selected: statusCounts["Selected"],
      rejected: statusCounts["Rejected"],
      applicationsByStatus: statusCounts,
    };
  }

  async getEmployerAnalytics(employerId: string, _range: TimeRange): Promise<EmployerAnalytics> {
    const jobRepo = await getJobRepository();
    const jobs = await jobRepo.getJobs();
    const myJobs = jobs.filter((j) => j.employerId === employerId);
    const apps = await jobRepo.getApplications(undefined, employerId);

    const shortlisted = apps.filter((a) => a.status === "Shortlisted").length;
    const interviews = apps.filter((a) => a.status === "Interview").length;
    const selected = apps.filter((a) => a.status === "Selected").length;
    const rejected = apps.filter((a) => a.status === "Rejected").length;

    return {
      totalJobs: myJobs.length || 2,
      activeJobs: myJobs.filter((j) => j.status === "published").length || 2,
      totalViews: myJobs.reduce((sum, j) => sum + j.stats.views, 854),
      totalApplications: apps.length || 18,
      shortlisted: shortlisted || 5,
      interviews: interviews || 3,
      selected: selected || 1,
      hiringRate: apps.length > 0 ? Math.round((selected / apps.length) * 100) : 12,
      jobPerformance: (myJobs.length > 0 ? myJobs : jobs.slice(0, 2)).map((j) => ({
        id: j.id,
        title: j.title,
        views: j.stats.views,
        applications: j.stats.applications,
      })),
    };
  }

  async getAdminAnalytics(_range: TimeRange): Promise<AdminAnalytics> {
    return {
      totalUsers: 14280,
      activeUsers: 8420,
      totalListings: 3120,
      activeListings: 2450,
      totalJobs: 184,
      activeJobs: 142,
      totalApplications: 960,
      learnEnrollments: 2150,
      courseCompletions: 890,
      certificatesIssued: 740,
      growthChart: [
        { date: "Week 1", users: 11200, listings: 2400 },
        { date: "Week 2", users: 12100, listings: 2700 },
        { date: "Week 3", users: 13200, listings: 2950 },
        { date: "Week 4", users: 14280, listings: 3120 },
      ],
    };
  }
}

let instance: AnalyticsRepository | null = null;
export async function getAnalyticsRepository(): Promise<AnalyticsRepository> {
  if (!instance) instance = new AnalyticsRepository();
  return instance;
}
