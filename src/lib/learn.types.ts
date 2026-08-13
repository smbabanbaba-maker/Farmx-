export type CourseCategory =
  | "Agriculture"
  | "Livestock"
  | "Poultry"
  | "Greenhouse Farming"
  | "Irrigation"
  | "Fish Farming"
  | "Beekeeping"
  | "Farm Machinery"
  | "Food Processing"
  | "Solar & Renewable Energy"
  | "Technology & Robotics"
  | "Digital Skills"
  | "Entrepreneurship"
  | "Business Management"
  | "Digital Marketing"
  | "Practical Skills"
  | "Other";

export type CourseType =
  "video" | "text" | "mixed" | "practical" | "short" | "full" | "live_recorded";

export type CourseDifficulty = "Beginner" | "Intermediate" | "Advanced";
export type CourseLanguage = "English" | "Hausa";
export type CourseAccessType = "FREE" | "PAID" | "PREMIUM";
export type CourseStatus = "draft" | "published" | "archived";

export interface Lesson {
  id: string;
  title: string;
  durationMinutes: number;
  type: "video" | "text" | "quiz" | "assignment";
  freePreview?: boolean;
  content: string;
  videoUrl?: string;
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

export interface CourseModule {
  id: string;
  title: string;
  summary: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  coverImage: string;
  category: CourseCategory;
  subcategory: string;
  courseType: CourseType;
  difficulty: CourseDifficulty;
  language: CourseLanguage;
  duration: string;
  instructor: {
    name: string;
    title: string;
    bio: string;
    avatar: string;
  };
  price: number;
  accessType: CourseAccessType;
  certificateEligibility: boolean;
  status: CourseStatus;
  featured?: boolean;
  popular?: boolean;
  newRelease?: boolean;
  modules: CourseModule[];
  createdAt: string;
  updatedAt: string;
  stats: {
    enrolledCount: number;
    rating: number;
    reviewCount: number;
  };
}

export interface CourseEnrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  status: "active" | "completed";
  progressPercent: number;
  completedLessonIds: string[];
  lastLessonId?: string;
  registrationDetails: {
    fullName: string;
    phone: string;
    email: string;
    state: string;
    lga?: string;
    city?: string;
    occupation?: string;
    educationLevel?: string;
    experience?: string;
    customAnswers?: Record<string, string>;
  };
  paymentReference?: string;
  certificateIssued?: boolean;
  certificateId?: string;
}

export interface CourseCertificate {
  id: string;
  userId: string;
  userName: string;
  courseId: string;
  courseTitle: string;
  issuedAt: string;
  verificationCode: string;
}
