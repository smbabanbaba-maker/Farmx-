export type JobCategory =
  | "Agriculture"
  | "Livestock"
  | "Poultry"
  | "Farm Operations"
  | "Software / IT"
  | "Solar / Renewable Energy"
  | "Engineering / Technicians"
  | "Drivers / Logistics"
  | "Construction"
  | "Marketing"
  | "Sales"
  | "Education / Teaching"
  | "Fashion"
  | "Hospitality"
  | "Administration"
  | "Finance / Business"
  | "Creative / Media"
  | "Skilled Trades"
  | "Warehouse / Operations"
  | "Other";

export type JobType =
  | "Full-time"
  | "Part-time"
  | "Contract"
  | "Temporary"
  | "Internship"
  | "Volunteer"
  | "Freelance";

export type WorkMode = "On-site" | "Remote" | "Hybrid";

export type ExperienceLevel =
  | "No Experience"
  | "Entry Level"
  | "Junior"
  | "Intermediate"
  | "Senior"
  | "Expert";

export type SalaryType =
  | "Negotiable"
  | "Fixed Salary"
  | "Salary Range"
  | "Hourly"
  | "Daily"
  | "Weekly"
  | "Monthly"
  | "Annual";

export type JobStatus = "draft" | "published" | "paused" | "closed" | "expired";

export type ApplicationStatus =
  | "Applied"
  | "Under Review"
  | "Shortlisted"
  | "Interview"
  | "Selected"
  | "Rejected"
  | "Withdrawn";

export interface JobEmployer {
  name: string;
  companyName: string;
  verified: boolean;
  rating: number;
  location: string;
  logo?: string;
}

export interface JobPost {
  id: string;
  title: string;
  company: string;
  employerId: string;
  description: string;
  category: JobCategory;
  subcategory: string;
  location: string;
  state: string;
  lga?: string;
  jobType: JobType;
  workMode: WorkMode;
  salaryType: SalaryType;
  salaryAmount?: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  experienceLevel: ExperienceLevel;
  educationRequirement?: string;
  skillsRequired: string[];
  responsibilities: string[];
  requirements: string[];
  benefits?: string[];
  vacancies: number;
  deadline: string;
  status: JobStatus;
  featured: boolean;
  employer: JobEmployer;
  createdAt: string;
  updatedAt: string;
  stats: {
    views: number;
    saves: number;
    shares: number;
    applications: number;
  };
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  userId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  applicantLocation: string;
  cvKey?: string;
  answers?: Record<string, string>;
  status: ApplicationStatus;
  appliedAt: string;
  updatedAt: string;
  notes?: string;
  interview?: {
    date: string;
    time: string;
    locationOrLink: string;
    notes?: string;
  };
}
