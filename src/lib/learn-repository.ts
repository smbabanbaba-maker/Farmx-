import type { Course, CourseEnrollment, CourseCertificate, CourseCategory } from "./learn.types";
import {
  getLearnRuntimeMode,
  getPublishedLearnCourses,
  getLearnCourseById,
  getMyLearnEnrollments,
  getMyLearnEnrollment,
  enrollInFreeLearnCourse,
  updateLearnProgress,
  getMyLearnCertificates,
  createLearnCourse,
  updateLearnCourse,
  deleteLearnCourse,
} from "./learn.functions";

const STORAGE_COURSES = "farmx_learn_courses_v1";
const STORAGE_ENROLLMENTS = "farmx_learn_enrollments_v1";
const STORAGE_CERTIFICATES = "farmx_learn_certificates_v1";

const SEED_COURSES: Course[] = [
  {
    id: "course-1",
    title: "Basic Poultry Farming & Broiler Management",
    shortDescription:
      "Learn professional poultry housing, biosecurity, feeding schedules, and disease prevention.",
    fullDescription:
      "A comprehensive practical guide designed for both beginner and expanding poultry farmers in Nigeria. Covers housing design, temperature control, vaccination calendars, feeding optimization for maximum weight gain, and disease management.",
    coverImage: "🐔",
    category: "Poultry",
    subcategory: "Broilers",
    courseType: "mixed",
    difficulty: "Beginner",
    language: "English",
    duration: "4 hours (12 lessons)",
    instructor: {
      name: "Dr. Aliyu Umar",
      title: "Senior Veterinary Consultant & Poultry Expert",
      bio: "Over 18 years of field experience helping commercial poultry farms across Northern Nigeria achieve 98% survival rates.",
      avatar: "AU",
    },
    price: 0,
    accessType: "FREE",
    certificateEligibility: true,
    status: "published",
    featured: true,
    popular: true,
    modules: [
      {
        id: "m1",
        title: "Module 1: Getting Started with Poultry",
        summary: "Fundamentals of farm setup and brooding.",
        lessons: [
          {
            id: "l1",
            title: "Introduction to Poultry Farming Business",
            durationMinutes: 15,
            type: "text",
            freePreview: true,
            content:
              "Poultry farming is one of the fastest-yielding agricultural ventures in Nigeria. Success depends on planning, biosecurity, and strict adherence to feeding and vaccination routines.",
          },
          {
            id: "l2",
            title: "Brooding Setup and Temperature Control",
            durationMinutes: 25,
            type: "video",
            freePreview: true,
            content:
              "The first 14 days determine 70% of your flock's success. Ensure stable heat source, clean wood shavings, and accessible electrolytes.",
            videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
          },
        ],
      },
      {
        id: "m2",
        title: "Module 2: Feeding & Vaccination Schedule",
        summary: "Nutritional phases and disease prevention.",
        lessons: [
          {
            id: "l3",
            title: "Starter, Grower, and Finisher Diets",
            durationMinutes: 20,
            type: "text",
            freePreview: false,
            content:
              "Switching feeds at the right age ensures optimal feed conversion ratio (FCR) without unnecessary cost.",
          },
          {
            id: "l4",
            title: "Essential Vaccination Calendar",
            durationMinutes: 30,
            type: "quiz",
            freePreview: false,
            content:
              "Newcastle and Gumboro vaccines must be administered strictly according to schedule through drinking water or eye drops.",
            quiz: [
              {
                question:
                  "At what age is the first Newcastle disease vaccine typically administered?",
                options: ["Day 1 - 4", "Day 21", "Day 40", "Week 10"],
                correctIndex: 0,
                explanation:
                  "First vaccination is usually given in the hatchery or within the first 4 days.",
              },
            ],
          },
        ],
      },
    ],
    createdAt: "2026-01-10T10:00:00Z",
    updatedAt: "2026-02-01T12:00:00Z",
    stats: { enrolledCount: 1420, rating: 4.8, reviewCount: 118 },
  },
  {
    id: "course-2",
    title: "Advanced Greenhouse Tomato Production",
    shortDescription:
      "Master fertigation, climate control, trellising, and pest management for high-yield tomatoes.",
    fullDescription:
      "Designed for commercial growers looking to maximize yields per square meter. Learn precise drip irrigation, EC/pH management in fertigation, pruning techniques, and biological pest control in protected structures.",
    coverImage: "🍅",
    category: "Greenhouse Farming",
    subcategory: "Hydroponics & Soil",
    courseType: "practical",
    difficulty: "Advanced",
    language: "English",
    duration: "8 hours (24 lessons)",
    instructor: {
      name: "Engr. Folake Adebayo",
      title: "AgriTech Systems Engineer",
      bio: "Built over 45 commercial greenhouses across Lagos, Ogun, and Kaduna states.",
      avatar: "FA",
    },
    price: 15000,
    accessType: "PAID",
    certificateEligibility: true,
    status: "published",
    featured: true,
    popular: true,
    modules: [
      {
        id: "gm1",
        title: "Module 1: Greenhouse Site & Structure Design",
        summary: "Choosing orientation, ventilation, and substrate.",
        lessons: [
          {
            id: "gl1",
            title: "Greenhouse Site Selection & Orientation",
            durationMinutes: 20,
            type: "text",
            freePreview: true,
            content:
              "Orientation must align with prevailing wind direction and maximum sunlight exposure.",
          },
          {
            id: "gl2",
            title: "Drip Irrigation and Fertigation Unit Setup",
            durationMinutes: 35,
            type: "video",
            freePreview: true,
            content:
              "Precise injection of NPK and micro-nutrients directly to the root zone eliminates fertilizer wastage.",
            videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
          },
        ],
      },
    ],
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-02-05T12:00:00Z",
    stats: { enrolledCount: 890, rating: 4.9, reviewCount: 94 },
  },
  {
    id: "course-3",
    title: "Solar Water Pumping & Renewable Energy for Farms",
    shortDescription:
      "Design, size, and maintain solar irrigation and borehole systems for off-grid farms.",
    fullDescription:
      "Empower your farm with reliable, cost-effective solar energy. Learn how to calculate total dynamic head (TDH), select solar PV panels and submersible pumps, and perform routine electrical maintenance.",
    coverImage: "☀️",
    category: "Solar & Renewable Energy",
    subcategory: "Solar Irrigation",
    courseType: "mixed",
    difficulty: "Intermediate",
    language: "English",
    duration: "5 hours (14 lessons)",
    instructor: {
      name: "Musa Danladi",
      title: "Renewable Energy Specialist",
      bio: "Pioneered solar irrigation systems for 300+ farming cooperatives in Northern Nigeria.",
      avatar: "MD",
    },
    price: 25000,
    accessType: "PREMIUM",
    certificateEligibility: true,
    status: "published",
    featured: false,
    popular: true,
    modules: [
      {
        id: "sm1",
        title: "Module 1: Solar Fundamentals for Agriculture",
        summary: "Understanding PV panels, inverters, and pump controllers.",
        lessons: [
          {
            id: "sl1",
            title: "Calculating Farm Water and Power Needs",
            durationMinutes: 30,
            type: "text",
            freePreview: true,
            content:
              "Accurately estimating cubic meters per hour and static water level prevents under-sizing your solar array.",
          },
        ],
      },
    ],
    createdAt: "2026-01-20T10:00:00Z",
    updatedAt: "2026-02-10T12:00:00Z",
    stats: { enrolledCount: 650, rating: 4.7, reviewCount: 52 },
  },
];

export interface LearnRepository {
  getCourses(options?: {
    category?: CourseCategory;
    search?: string;
    accessType?: string;
  }): Promise<Course[]>;
  getCourseById(id: string): Promise<Course | null>;
  createCourse(course: Omit<Course, "id" | "createdAt" | "updatedAt" | "stats">): Promise<Course>;
  updateCourse(id: string, updates: Partial<Course>): Promise<Course>;
  deleteCourse(id: string): Promise<void>;
  getEnrollments(userId: string): Promise<CourseEnrollment[]>;
  getEnrollment(userId: string, courseId: string): Promise<CourseEnrollment | null>;
  enrollUser(
    input: Omit<CourseEnrollment, "id" | "enrolledAt" | "progressPercent" | "completedLessonIds">,
  ): Promise<CourseEnrollment>;
  updateProgress(enrollmentId: string, lessonId: string): Promise<CourseEnrollment>;
  getCertificates(userId: string): Promise<CourseCertificate[]>;
  issueCertificate(
    userId: string,
    courseId: string,
    userName: string,
    courseTitle: string,
  ): Promise<CourseCertificate>;
}

class PreviewLearnRepository implements LearnRepository {
  private getCoursesList(): Course[] {
    if (typeof window === "undefined") return SEED_COURSES;
    const raw = localStorage.getItem(STORAGE_COURSES);
    if (!raw) {
      localStorage.setItem(STORAGE_COURSES, JSON.stringify(SEED_COURSES));
      return SEED_COURSES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return SEED_COURSES;
    }
  }

  private saveCoursesList(courses: Course[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_COURSES, JSON.stringify(courses));
  }

  private getEnrollmentsList(): CourseEnrollment[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_ENROLLMENTS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private saveEnrollmentsList(list: CourseEnrollment[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_ENROLLMENTS, JSON.stringify(list));
  }

  async getCourses(options?: {
    category?: CourseCategory;
    search?: string;
    accessType?: string;
  }): Promise<Course[]> {
    let list = this.getCoursesList();
    if (options?.category) {
      list = list.filter((c) => c.category === options.category);
    }
    if (options?.accessType) {
      list = list.filter((c) => c.accessType === options.accessType);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.shortDescription.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q),
      );
    }
    return list;
  }

  async getCourseById(id: string): Promise<Course | null> {
    const list = this.getCoursesList();
    return list.find((c) => c.id === id) ?? null;
  }

  async createCourse(
    input: Omit<Course, "id" | "createdAt" | "updatedAt" | "stats">,
  ): Promise<Course> {
    const list = this.getCoursesList();
    const newCourse: Course = {
      ...input,
      id: `course-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stats: { enrolledCount: 0, rating: 5.0, reviewCount: 0 },
    };
    list.unshift(newCourse);
    this.saveCoursesList(list);
    return newCourse;
  }

  async updateCourse(id: string, updates: Partial<Course>): Promise<Course> {
    const list = this.getCoursesList();
    const index = list.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("Course not found");
    const updated: Course = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    list[index] = updated;
    this.saveCoursesList(list);
    return updated;
  }

  async deleteCourse(id: string): Promise<void> {
    const list = this.getCoursesList();
    const filtered = list.filter((c) => c.id !== id);
    this.saveCoursesList(filtered);
  }

  async getEnrollments(userId: string): Promise<CourseEnrollment[]> {
    const list = this.getEnrollmentsList();
    return list.filter((e) => e.userId === userId);
  }

  async getEnrollment(userId: string, courseId: string): Promise<CourseEnrollment | null> {
    const list = this.getEnrollmentsList();
    return list.find((e) => e.userId === userId && e.courseId === courseId) ?? null;
  }

  async enrollUser(
    input: Omit<CourseEnrollment, "id" | "enrolledAt" | "progressPercent" | "completedLessonIds">,
  ): Promise<CourseEnrollment> {
    const list = this.getEnrollmentsList();
    const existing = list.find((e) => e.userId === input.userId && e.courseId === input.courseId);
    if (existing) return existing;

    const newEnrollment: CourseEnrollment = {
      ...input,
      id: `enr-${Date.now()}`,
      enrolledAt: new Date().toISOString(),
      progressPercent: 0,
      completedLessonIds: [],
    };
    list.unshift(newEnrollment);
    this.saveEnrollmentsList(list);
    return newEnrollment;
  }

  async updateProgress(enrollmentId: string, lessonId: string): Promise<CourseEnrollment> {
    const list = this.getEnrollmentsList();
    const index = list.findIndex((e) => e.id === enrollmentId);
    if (index === -1) throw new Error("Enrollment not found");
    const enr = list[index];
    if (!enr.completedLessonIds.includes(lessonId)) {
      enr.completedLessonIds.push(lessonId);
    }
    enr.lastLessonId = lessonId;

    // Calculate percentage based on course modules
    const course = await this.getCourseById(enr.courseId);
    if (course) {
      const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
      if (totalLessons > 0) {
        enr.progressPercent = Math.min(
          100,
          Math.round((enr.completedLessonIds.length / totalLessons) * 100),
        );
        if (enr.progressPercent === 100) {
          enr.status = "completed";
        }
      }
    }
    list[index] = enr;
    this.saveEnrollmentsList(list);
    return enr;
  }

  async getCertificates(userId: string): Promise<CourseCertificate[]> {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_CERTIFICATES);
    if (!raw) return [];
    try {
      const list: CourseCertificate[] = JSON.parse(raw);
      return list.filter((c) => c.userId === userId);
    } catch {
      return [];
    }
  }

  async issueCertificate(
    userId: string,
    courseId: string,
    userName: string,
    courseTitle: string,
  ): Promise<CourseCertificate> {
    const certs = await this.getCertificates(userId);
    const existing = certs.find((c) => c.courseId === courseId);
    if (existing) return existing;

    const newCert: CourseCertificate = {
      id: `cert-${Date.now()}`,
      userId,
      userName,
      courseId,
      courseTitle,
      issuedAt: new Date().toISOString(),
      verificationCode: `FX-CERT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    };

    const raw = localStorage.getItem(STORAGE_CERTIFICATES);
    const allCerts: CourseCertificate[] = raw ? JSON.parse(raw) : [];
    allCerts.unshift(newCert);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_CERTIFICATES, JSON.stringify(allCerts));
    }
    return newCert;
  }
}

class ProductionLearnRepository implements LearnRepository {
  async getCourses(options?: {
    category?: CourseCategory;
    search?: string;
    accessType?: string;
  }): Promise<Course[]> {
    let courses = await getPublishedLearnCourses();
    if (options?.category)
      courses = courses.filter((course) => course.category === options.category);
    if (options?.accessType)
      courses = courses.filter((course) => course.accessType === options.accessType);
    if (options?.search) {
      const query = options.search.toLowerCase();
      courses = courses.filter(
        (course) =>
          course.title.toLowerCase().includes(query) ||
          course.shortDescription.toLowerCase().includes(query) ||
          course.category.toLowerCase().includes(query),
      );
    }
    return courses;
  }

  getCourseById(id: string): Promise<Course | null> {
    return getLearnCourseById({ data: { courseId: id } });
  }

  async createCourse(
    course: Omit<Course, "id" | "createdAt" | "updatedAt" | "stats">,
  ): Promise<Course> {
    const created: Course = {
      ...course,
      id: `course-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stats: { enrolledCount: 0, rating: 0, reviewCount: 0 },
    };
    await createLearnCourse({ data: { course: created as unknown as Record<string, unknown> } });
    return created;
  }

  async updateCourse(id: string, updates: Partial<Course>): Promise<Course> {
    await updateLearnCourse({
      data: { courseId: id, updates: updates as unknown as Record<string, unknown> },
    });
    const updated = await this.getCourseById(id);
    if (!updated) throw new Error("Course not found after update");
    return updated;
  }

  async deleteCourse(id: string): Promise<void> {
    await deleteLearnCourse({ data: { courseId: id } });
  }

  getEnrollments(_userId: string): Promise<CourseEnrollment[]> {
    return getMyLearnEnrollments();
  }

  getEnrollment(_userId: string, courseId: string): Promise<CourseEnrollment | null> {
    return getMyLearnEnrollment({ data: { courseId } });
  }

  enrollUser(
    input: Omit<CourseEnrollment, "id" | "enrolledAt" | "progressPercent" | "completedLessonIds">,
  ): Promise<CourseEnrollment> {
    return enrollInFreeLearnCourse({
      data: { courseId: input.courseId, registrationDetails: input.registrationDetails },
    });
  }

  updateProgress(enrollmentId: string, lessonId: string): Promise<CourseEnrollment> {
    return updateLearnProgress({ data: { enrollmentId, lessonId } });
  }

  getCertificates(_userId: string): Promise<CourseCertificate[]> {
    return getMyLearnCertificates();
  }

  issueCertificate(): Promise<CourseCertificate> {
    return Promise.reject(
      new Error("Certificate issuing must be completed by the verified Learn completion service."),
    );
  }
}

let repositoryInstance: LearnRepository | null = null;
export async function getLearnRepository(): Promise<LearnRepository> {
  if (repositoryInstance) return repositoryInstance;
  const mode = await getLearnRuntimeMode().catch((error) => {
    if (import.meta.env.PROD) throw error;
    return { mode: "preview" as const };
  });
  repositoryInstance =
    mode.mode === "production" ? new ProductionLearnRepository() : new PreviewLearnRepository();
  return repositoryInstance;
}
