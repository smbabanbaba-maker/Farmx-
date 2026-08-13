import type { JobPost, JobApplication, JobCategory } from "./job.types";

const STORAGE_JOBS = "farmx_jobs_v1";
const STORAGE_APPLICATIONS = "farmx_job_applications_v1";
const STORAGE_SAVED_JOBS = "farmx_saved_jobs_v1";

const seedJobs: JobPost[] = [
  {
    id: "job-1",
    title: "Senior Agricultural Extension Officer",
    company: "GreenFields Agro Allied Ltd",
    employerId: "emp-1",
    description: "Lead farmer outreach programs, provide technical advisory on modern crop management, and supervise field trials across multiple states.",
    category: "Agriculture",
    subcategory: "Agronomy",
    location: "Kano",
    state: "Kano",
    jobType: "Full-time",
    workMode: "On-site",
    salaryType: "Salary Range",
    salaryMin: 180000,
    salaryMax: 250000,
    salaryCurrency: "₦",
    experienceLevel: "Senior",
    educationRequirement: "B.Sc in Agronomy or Agricultural Science",
    skillsRequired: ["Crop Management", "Farmer Training", "Data Collection", "Communication"],
    responsibilities: ["Coordinate agronomy training workshops", "Monitor crop yield experiments", "Report regional agricultural metrics"],
    requirements: ["Minimum 4 years experience in farm extension", "Strong Hausa and English communication", "Valid driver's license"],
    benefits: ["Health insurance", "Transport allowance", "Performance bonus"],
    vacancies: 2,
    deadline: "2026-09-30",
    status: "published",
    featured: true,
    employer: {
      name: "Dr. Aliyu Bala",
      companyName: "GreenFields Agro Allied Ltd",
      verified: true,
      rating: 4.8,
      location: "Kano",
    },
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    stats: { views: 342, saves: 48, shares: 15, applications: 12 },
  },
  {
    id: "job-2",
    title: "Solar Irrigation Technician",
    company: "SunPower Agro Systems",
    employerId: "emp-2",
    description: "Install, configure, and maintain solar-powered borehole and drip irrigation systems for commercial farms.",
    category: "Solar / Renewable Energy",
    subcategory: "Solar Installation",
    location: "Kaduna",
    state: "Kaduna",
    jobType: "Full-time",
    workMode: "On-site",
    salaryType: "Fixed Salary",
    salaryAmount: 150000,
    salaryCurrency: "₦",
    experienceLevel: "Intermediate",
    educationRequirement: "OND / HND in Electrical Engineering or related",
    skillsRequired: ["Solar Panel Wiring", "Inverter Configuration", "Water Pump Maintenance"],
    responsibilities: ["Deploy solar water pumps on client farms", "Troubleshoot electrical faults", "Train farmers on system usage"],
    requirements: ["2+ years solar installation experience", "Willingness to travel to rural farming clusters"],
    benefits: ["Tools provided", "Field accommodation"],
    vacancies: 3,
    deadline: "2026-10-15",
    status: "published",
    featured: true,
    employer: {
      name: "Zainab Umar",
      companyName: "SunPower Agro Systems",
      verified: true,
      rating: 4.9,
      location: "Kaduna",
    },
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    stats: { views: 512, saves: 89, shares: 24, applications: 19 },
  },
  {
    id: "job-3",
    title: "Poultry Farm Supervisor",
    company: "Golden Eggs Integrated Farms",
    employerId: "emp-3",
    description: "Supervise daily feeding, biosecurity protocols, egg collection, and vaccination schedules for a 20,000-bird layer farm.",
    category: "Poultry",
    subcategory: "Layers Management",
    location: "Ibadan",
    state: "Oyo",
    jobType: "Full-time",
    workMode: "On-site",
    salaryType: "Salary Range",
    salaryMin: 120000,
    salaryMax: 160000,
    salaryCurrency: "₦",
    experienceLevel: "Junior",
    educationRequirement: "ND in Animal Science or related",
    skillsRequired: ["Biosecurity", "Feed Management", "Vaccination", "Record Keeping"],
    responsibilities: ["Manage daily feeding cycles", "Monitor flock health and mortality", "Supervise sorting and packaging of eggs"],
    requirements: ["1+ year poultry farm experience", "Live-in readiness on farm property"],
    vacancies: 1,
    deadline: "2026-09-15",
    status: "published",
    featured: false,
    employer: {
      name: "Oluwaseun Adebayo",
      companyName: "Golden Eggs Integrated Farms",
      verified: true,
      rating: 4.6,
      location: "Ibadan",
    },
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    stats: { views: 218, saves: 31, shares: 8, applications: 7 },
  },
  {
    id: "job-4",
    title: "Logistics & Fleet Dispatcher",
    company: "AgroHaul Express",
    employerId: "emp-4",
    description: "Coordinate grain and produce transit from northern farming hubs to southern wholesale markets.",
    category: "Drivers / Logistics",
    subcategory: "Fleet Dispatch",
    location: "Abuja",
    state: "FCT",
    jobType: "Full-time",
    workMode: "On-site",
    salaryType: "Salary Range",
    salaryMin: 140000,
    salaryMax: 190000,
    salaryCurrency: "₦",
    experienceLevel: "Intermediate",
    skillsRequired: ["Route Planning", "Driver Coordination", "Waybill Management", "GPS Tracking"],
    responsibilities: ["Dispatch trucks according to delivery schedules", "Track transit status in real time", "Resolve logistics bottlenecks"],
    requirements: ["Experience in agricultural logistics", "Proficiency with dispatch software"],
    vacancies: 2,
    deadline: "2026-10-01",
    status: "published",
    featured: false,
    employer: {
      name: "Kabiru Danladi",
      companyName: "AgroHaul Express",
      verified: false,
      rating: 4.3,
      location: "Abuja",
    },
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    stats: { views: 184, saves: 19, shares: 5, applications: 6 },
  },
];

export interface JobRepository {
  getJobs(options?: { category?: JobCategory; search?: string; state?: string; jobType?: string }): Promise<JobPost[]>;
  getJobById(id: string): Promise<JobPost | null>;
  createJob(job: Omit<JobPost, "id" | "createdAt" | "updatedAt" | "stats">): Promise<JobPost>;
  updateJob(id: string, updates: Partial<JobPost>): Promise<JobPost>;
  deleteJob(id: string): Promise<void>;
  getApplications(userId?: string, employerId?: string): Promise<JobApplication[]>;
  applyForJob(input: Omit<JobApplication, "id" | "appliedAt" | "updatedAt" | "status">): Promise<JobApplication>;
  updateApplicationStatus(applicationId: string, status: JobApplication["status"], notes?: string, interview?: JobApplication["interview"]): Promise<JobApplication>;
  getSavedJobIds(userId: string): Promise<string[]>;
  toggleSaveJob(userId: string, jobId: string): Promise<boolean>;
}

class PreviewJobRepository implements JobRepository {
  private getStorage<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  private setStorage<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage quota exceeded or unavailable */
    }
  }

  async getJobs(options?: { category?: JobCategory; search?: string; state?: string; jobType?: string }): Promise<JobPost[]> {
    let jobs = this.getStorage<JobPost[]>(STORAGE_JOBS, seedJobs);
    if (options?.category) jobs = jobs.filter((j) => j.category === options.category);
    if (options?.state) jobs = jobs.filter((j) => j.state.toLowerCase() === options.state!.toLowerCase());
    if (options?.jobType) jobs = jobs.filter((j) => j.jobType === options.jobType);
    if (options?.search) {
      const q = options.search.toLowerCase();
      jobs = jobs.filter((j) => j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.description.toLowerCase().includes(q) || j.skillsRequired.some((s) => s.toLowerCase().includes(q)));
    }
    return jobs.filter((j) => j.status === "published");
  }

  async getJobById(id: string): Promise<JobPost | null> {
    const jobs = this.getStorage<JobPost[]>(STORAGE_JOBS, seedJobs);
    return jobs.find((j) => j.id === id) || null;
  }

  async createJob(job: Omit<JobPost, "id" | "createdAt" | "updatedAt" | "stats">): Promise<JobPost> {
    const jobs = this.getStorage<JobPost[]>(STORAGE_JOBS, seedJobs);
    const newJob: JobPost = {
      ...job,
      id: `job-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stats: { views: 1, saves: 0, shares: 0, applications: 0 },
    };
    jobs.unshift(newJob);
    this.setStorage(STORAGE_JOBS, jobs);
    return newJob;
  }

  async updateJob(id: string, updates: Partial<JobPost>): Promise<JobPost> {
    const jobs = this.getStorage<JobPost[]>(STORAGE_JOBS, seedJobs);
    const index = jobs.findIndex((j) => j.id === id);
    if (index === -1) throw new Error("Job not found");
    jobs[index] = { ...jobs[index], ...updates, updatedAt: new Date().toISOString() };
    this.setStorage(STORAGE_JOBS, jobs);
    return jobs[index];
  }

  async deleteJob(id: string): Promise<void> {
    let jobs = this.getStorage<JobPost[]>(STORAGE_JOBS, seedJobs);
    jobs = jobs.filter((j) => j.id !== id);
    this.setStorage(STORAGE_JOBS, jobs);
  }

  async getApplications(userId?: string, employerId?: string): Promise<JobApplication[]> {
    const apps = this.getStorage<JobApplication[]>(STORAGE_APPLICATIONS, []);
    if (userId) return apps.filter((a) => a.userId === userId);
    if (employerId) {
      const jobs = this.getStorage<JobPost[]>(STORAGE_JOBS, seedJobs);
      const empJobIds = new Set(jobs.filter((j) => j.employerId === employerId).map((j) => j.id));
      return apps.filter((a) => empJobIds.has(a.jobId));
    }
    return apps;
  }

  async applyForJob(input: Omit<JobApplication, "id" | "appliedAt" | "updatedAt" | "status">): Promise<JobApplication> {
    const apps = this.getStorage<JobApplication[]>(STORAGE_APPLICATIONS, []);
    const existing = apps.find((a) => a.jobId === input.jobId && a.userId === input.userId);
    if (existing) throw new Error("You have already applied for this position.");
    const newApp: JobApplication = {
      ...input,
      id: `app-${Date.now()}`,
      status: "Applied",
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    apps.unshift(newApp);
    this.setStorage(STORAGE_APPLICATIONS, apps);
    return newApp;
  }

  async updateApplicationStatus(applicationId: string, status: JobApplication["status"], notes?: string, interview?: JobApplication["interview"]): Promise<JobApplication> {
    const apps = this.getStorage<JobApplication[]>(STORAGE_APPLICATIONS, []);
    const index = apps.findIndex((a) => a.id === applicationId);
    if (index === -1) throw new Error("Application not found");
    apps[index] = {
      ...apps[index],
      status,
      notes: notes !== undefined ? notes : apps[index].notes,
      interview: interview !== undefined ? interview : apps[index].interview,
      updatedAt: new Date().toISOString(),
    };
    this.setStorage(STORAGE_APPLICATIONS, apps);
    return apps[index];
  }

  async getSavedJobIds(userId: string): Promise<string[]> {
    const saved = this.getStorage<Record<string, string[]>>(STORAGE_SAVED_JOBS, {});
    return saved[userId] || [];
  }

  async toggleSaveJob(userId: string, jobId: string): Promise<boolean> {
    const saved = this.getStorage<Record<string, string[]>>(STORAGE_SAVED_JOBS, {});
    const userSaved = new Set(saved[userId] || []);
    const isSaved = userSaved.has(jobId);
    if (isSaved) userSaved.delete(jobId);
    else userSaved.add(jobId);
    saved[userId] = Array.from(userSaved);
    this.setStorage(STORAGE_SAVED_JOBS, saved);
    return !isSaved;
  }
}

let instance: JobRepository | null = null;
export async function getJobRepository(): Promise<JobRepository> {
  if (!instance) instance = new PreviewJobRepository();
  return instance;
}
