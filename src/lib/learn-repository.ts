import type { Course, CourseEnrollment, CourseCertificate, CourseCategory } from "./learn.types";
import {
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

const productionRepository: LearnRepository = {
  async getCourses(options) {
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
  },
  getCourseById: (id) => getLearnCourseById({ data: { courseId: id } }),
  async createCourse(course) {
    const created: Course = {
      ...course,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stats: { enrolledCount: 0, rating: 0, reviewCount: 0 },
    };
    await createLearnCourse({ data: { course: created as unknown as Record<string, unknown> } });
    return created;
  },
  async updateCourse(id, updates) {
    await updateLearnCourse({
      data: { courseId: id, updates: updates as unknown as Record<string, unknown> },
    });
    const updated = await getLearnCourseById({ data: { courseId: id } });
    if (!updated) throw new Error("Course not found after update");
    return updated;
  },
  deleteCourse: async (id) => {
    await deleteLearnCourse({ data: { courseId: id } });
  },
  getEnrollments: async (_userId) => getMyLearnEnrollments(),
  getEnrollment: async (_userId, courseId) => getMyLearnEnrollment({ data: { courseId } }),
  enrollUser: (input) =>
    enrollInFreeLearnCourse({
      data: { courseId: input.courseId, registrationDetails: input.registrationDetails },
    }),
  updateProgress: (enrollmentId, lessonId) =>
    updateLearnProgress({ data: { enrollmentId, lessonId } }),
  getCertificates: async (_userId) => getMyLearnCertificates(),
  issueCertificate: async () => {
    throw new Error(
      "Certificate issuing must be completed by the verified Learn completion service.",
    );
  },
};

let repositoryInstance: LearnRepository | null = null;
export async function getLearnRepository(): Promise<LearnRepository> {
  repositoryInstance ??= productionRepository;
  return repositoryInstance;
}
