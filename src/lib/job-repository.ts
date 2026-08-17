import type { JobApplication, JobCategory, JobPost } from "./job.types";
import {
  applyForJob as applyForJobFn,
  createJob as createJobFn,
  deleteJob as deleteJobFn,
  getApplications as getApplicationsFn,
  getJobById as getJobByIdFn,
  getPublishedJobs,
  getSavedJobIds as getSavedJobIdsFn,
  toggleSaveJob as toggleSaveJobFn,
  updateApplicationStatus as updateApplicationStatusFn,
  updateJob as updateJobFn,
} from "./job.functions";

export interface JobRepository {
  getJobs(options?: {
    category?: JobCategory;
    search?: string;
    state?: string;
    jobType?: string;
  }): Promise<JobPost[]>;
  getJobById(id: string): Promise<JobPost | null>;
  createJob(job: Omit<JobPost, "id" | "createdAt" | "updatedAt" | "stats">): Promise<JobPost>;
  updateJob(id: string, updates: Partial<JobPost>): Promise<JobPost>;
  deleteJob(id: string): Promise<void>;
  getApplications(userId?: string, employerId?: string): Promise<JobApplication[]>;
  applyForJob(
    input: Omit<JobApplication, "id" | "appliedAt" | "updatedAt" | "status">,
  ): Promise<JobApplication>;
  updateApplicationStatus(
    applicationId: string,
    status: JobApplication["status"],
    notes?: string,
    interview?: JobApplication["interview"],
  ): Promise<JobApplication>;
  getSavedJobIds(userId?: string): Promise<string[]>;
  toggleSaveJob(userId: string | undefined, jobId: string): Promise<boolean>;
}

const productionRepository: JobRepository = {
  getJobs: (options) => getPublishedJobs({ data: options ?? {} }),
  getJobById: (id) => getJobByIdFn({ data: { jobId: id } }),
  createJob: (job) => createJobFn({ data: { job } }),
  updateJob: (id, updates) => updateJobFn({ data: { jobId: id, updates } }),
  deleteJob: async (id) => {
    await deleteJobFn({ data: { jobId: id } });
  },
  getApplications: (userId, employerId) => getApplicationsFn({ data: { userId, employerId } }),
  applyForJob: (input) => applyForJobFn({ data: input }),
  updateApplicationStatus: (applicationId, status, notes, interview) =>
    updateApplicationStatusFn({ data: { applicationId, status, notes, interview } }),
  getSavedJobIds: () => getSavedJobIdsFn(),
  toggleSaveJob: (_userId, jobId) => toggleSaveJobFn({ data: { jobId } }),
};

let instance: JobRepository | null = null;
export async function getJobRepository(): Promise<JobRepository> {
  instance ??= productionRepository;
  return instance;
}
export function getJobRuntimeModeClient() {
  return "production" as const;
}
