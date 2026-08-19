import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  GraduationCap,
  LockKeyhole,
  PlayCircle,
  Search,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getMyProfile } from "@/lib/profile.functions";
import { getLearnRepository } from "@/lib/learn-repository";
import type { Course, CourseCategory, CourseEnrollment } from "@/lib/learn.types";
import { breadcrumbJsonLd, createSeoHead, publicIndexingEnabled } from "@/lib/seo";

const categoryItems: { name: CourseCategory; icon: string }[] = [
  { name: "Agriculture", icon: "🌾" },
  { name: "Livestock", icon: "🐄" },
  { name: "Poultry", icon: "🐔" },
  { name: "Greenhouse Farming", icon: "🍅" },
  { name: "Irrigation", icon: "💧" },
  { name: "Fish Farming", icon: "🐟" },
  { name: "Beekeeping", icon: "🐝" },
  { name: "Farm Machinery", icon: "🚜" },
  { name: "Food Processing", icon: "🥫" },
  { name: "Solar & Renewable Energy", icon: "☀️" },
  { name: "Technology & Robotics", icon: "🤖" },
  { name: "Digital Skills", icon: "💻" },
  { name: "Entrepreneurship", icon: "💼" },
  { name: "Business Management", icon: "📊" },
  { name: "Digital Marketing", icon: "📱" },
  { name: "Practical Skills", icon: "🛠️" },
  { name: "Other", icon: "✦" },
];

export const Route = createFileRoute("/learn")({
  head: ({ matches }) =>
    matches[matches.length - 1]?.pathname === "/learn"
      ? createSeoHead({
          title: "Agricultural learning courses in Nigeria | Goall26 Learn",
          description:
            "Learn agriculture, poultry, livestock, irrigation, business and digital skills through public Goall26 courses.",
          path: "/learn",
          keywords: [
            "agriculture courses Nigeria",
            "farm training",
            "Goall26 Learn",
            "agricultural education",
          ],
          noindex: !publicIndexingEnabled(),
          jsonLd: breadcrumbJsonLd([{ name: "Goall26 Learn", path: "/learn" }]),
        })
      : {},
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" && search.q ? search.q : undefined,
    category: categoryItems.some((item) => item.name === search.category)
      ? (search.category as CourseCategory)
      : undefined,
  }),
  component: LearnHome,
});

function LearnHome() {
  const { q = "", category } = Route.useSearch();
  const navigate = useNavigate();
  const [search, setSearch] = useState(q);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [certificates, setCertificates] = useState<
    {
      id: string;
      courseId: string;
      courseTitle: string;
      issuedAt: string;
      verificationCode: string;
    }[]
  >([]);
  const [profile, setProfile] = useState<{
    fullName?: string;
    state?: string;
    location?: string;
    phone?: string;
    email?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const repository = await getLearnRepository();
        const [nextCourses, nextEnrollments, nextCertificates, profileResult] = await Promise.all([
          repository.getCourses({ search: q, category }),
          repository.getEnrollments(""),
          repository.getCertificates(""),
          getMyProfile().catch(() => null),
        ]);
        if (cancelled) return;
        setCourses(nextCourses.filter((course) => course.status === "published"));
        setEnrollments(nextEnrollments);
        setCertificates(nextCertificates);
        setProfile(
          profileResult?.profile
            ? {
                fullName: profileResult.profile.fullName,
                state: profileResult.profile.state,
                location: profileResult.profile.location,
                phone: profileResult.profile.phone,
                email: profileResult.profile.email,
              }
            : null,
        );
      } catch {
        if (!cancelled) setError("Goall26 Learn is temporarily unable to load. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [category, q]);

  const enrolledCourseIds = useMemo(
    () => new Set(enrollments.map((item) => item.courseId)),
    [enrollments],
  );
  const enrollmentByCourse = useMemo(
    () => new Map(enrollments.map((item) => [item.courseId, item])),
    [enrollments],
  );
  const featured = courses.filter((course) => course.featured);
  const popular = courses.filter((course) => course.popular);
  const newCourses = courses.filter((course) => course.newRelease);
  const continueLearning = courses.filter(
    (course) =>
      enrolledCourseIds.has(course.id) &&
      (enrollmentByCourse.get(course.id)?.progressPercent ?? 0) < 100,
  );
  const recommended = courses.filter((course) => !enrolledCourseIds.has(course.id)).slice(0, 6);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    void navigate({ to: "/learn", search: { q: search.trim(), category: undefined } });
  };

  const filterCategory = (nextCategory: CourseCategory | undefined) => {
    void navigate({ to: "/learn", search: { q: search, category: nextCategory } });
  };

  return (
    <AppShell title="Goall26 Learn">
      <div className="space-y-7 pb-8">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand to-foreground p-5 text-brand-foreground shadow-lg sm:p-7">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 -left-5 h-32 w-32 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                  <GraduationCap className="h-3.5 w-3.5" /> Official Goall26 Learning Center
                </span>
                <h1 className="mt-4 max-w-lg text-2xl font-black tracking-tight sm:text-3xl">
                  Learn practical skills. Build a stronger future.
                </h1>
                <p className="mt-2 max-w-xl text-xs leading-5 text-white/80">
                  Expert-led agriculture, business, technology, and practical skills courses created
                  for the Goall26 community.
                </p>
              </div>
              <div className="hidden rounded-3xl border border-white/20 bg-white/10 p-4 sm:block">
                <BookOpen className="h-10 w-10" />
              </div>
            </div>
            <form onSubmit={submitSearch} className="relative mt-5 max-w-2xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search courses, lessons and topics…"
                aria-label="Search Goall26 Learn"
                className="min-h-12 w-full rounded-2xl border border-white/20 bg-white pl-10 pr-20 text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-white/40"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-16 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground"
                  aria-label="Clear course search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl bg-brand px-3 py-2 text-xs font-black text-brand-foreground"
              >
                Search
              </button>
            </form>
          </div>
        </section>

        {profile?.fullName && (
          <p className="text-xs text-muted-foreground">
            Welcome back, <span className="font-black text-foreground">{profile.fullName}</span>.
            Continue your learning journey.
          </p>
        )}

        {category && (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-brand/10 px-3 py-1.5 text-[10px] font-black text-brand">
              {category}
            </span>
            <button
              type="button"
              onClick={() => filterCategory(undefined)}
              className="text-[10px] font-black text-muted-foreground underline"
            >
              Clear category
            </button>
          </div>
        )}

        {loading ? (
          <LearnSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        ) : courses.length === 0 ? (
          <EmptyLearn
            onClear={() => {
              setSearch("");
              filterCategory(undefined);
            }}
          />
        ) : (
          <>
            <CourseRail
              title="Featured Courses"
              subtitle="Official Goall26 programmes selected for practical impact"
              courses={featured}
            />

            {continueLearning.length > 0 && (
              <section id="my-learning" className="space-y-3">
                <SectionHeading
                  icon={<PlayCircle className="h-4 w-4" />}
                  title="Continue Learning"
                  subtitle="Pick up where you stopped"
                />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {continueLearning.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      enrollment={enrollmentByCourse.get(course.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            <CategoryGrid selected={category} onSelect={filterCategory} />
            <CourseRail
              title="Popular Courses"
              subtitle="Build skills learners return to"
              courses={popular}
            />
            {newCourses.length > 0 && (
              <CourseRail
                title="New Courses"
                subtitle="Recently published by Goall26 Learn"
                courses={newCourses}
              />
            )}
            <CourseRail
              title="Recommended Courses"
              subtitle="Keep growing with the next practical skill"
              courses={recommended}
            />

            <section
              id="my-certificates"
              className="rounded-3xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <SectionHeading
                  icon={<Award className="h-4 w-4" />}
                  title="My Certificates"
                  subtitle="Your verified Goall26 Learn achievements"
                />
                <Link
                  to="/learn"
                  search={{ q: "", category: undefined }}
                  hash="my-certificates"
                  className="text-[10px] font-black text-brand"
                >
                  View all
                </Link>
              </div>
              {certificates.length === 0 ? (
                <p className="mt-4 rounded-2xl bg-muted/60 p-4 text-xs text-muted-foreground">
                  Certificates will appear here after you complete an eligible course.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {certificates.slice(0, 4).map((certificate) => (
                    <div
                      key={certificate.id}
                      className="flex items-center gap-3 rounded-2xl border border-brand/20 bg-brand/5 p-3"
                    >
                      <Trophy className="h-6 w-6 text-brand" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black">{certificate.courseTitle}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Verified {new Date(certificate.issuedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function SectionHeading({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-brand">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand/10">
          {icon}
        </span>
        <h2 className="text-base font-black">{title}</h2>
      </div>
      {subtitle && <p className="mt-1 pl-9 text-[10px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function CourseRail({
  title,
  subtitle,
  courses,
}: {
  title: string;
  subtitle?: string;
  courses: Course[];
}) {
  if (courses.length === 0) return null;
  return (
    <section className="space-y-3">
      <SectionHeading icon={<Sparkles className="h-4 w-4" />} title={title} subtitle={subtitle} />
      <div className="flex gap-3 overflow-x-auto pb-2">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} compact />
        ))}
      </div>
    </section>
  );
}

function CategoryGrid({
  selected,
  onSelect,
}: {
  selected?: CourseCategory;
  onSelect: (category: CourseCategory | undefined) => void;
}) {
  return (
    <section className="space-y-3">
      <SectionHeading
        icon={<BookOpen className="h-4 w-4" />}
        title="Categories"
        subtitle="Choose a skill path"
      />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
        {categoryItems.map((category) => (
          <button
            type="button"
            key={category.name}
            onClick={() => onSelect(selected === category.name ? undefined : category.name)}
            className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-center transition active:scale-[0.98] ${selected === category.name ? "border-brand bg-brand text-brand-foreground" : "border-border bg-card hover:border-brand/50"}`}
          >
            <span className="text-xl" aria-hidden="true">
              {category.icon}
            </span>
            <span className="text-[9px] font-black leading-tight">{category.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function CourseCard({
  course,
  compact = false,
  enrollment,
}: {
  course: Course;
  compact?: boolean;
  enrollment?: CourseEnrollment;
}) {
  return (
    <article
      className={`group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md ${compact ? "min-w-[260px] max-w-[260px]" : ""}`}
    >
      <Link
        to="/learn/$courseId"
        params={{ courseId: course.id }}
        search={{ q: "", category: undefined }}
        className="block"
      >
        <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-brand/15 via-accent to-brand/5 text-6xl">
          <span aria-hidden="true">{course.coverImage}</span>
          <div className="absolute left-3 top-3 flex flex-wrap gap-1">
            <span className="rounded-full bg-brand px-2 py-1 text-[9px] font-black text-brand-foreground">
              {course.accessType === "FREE"
                ? "FREE"
                : course.accessType === "PREMIUM"
                  ? "PREMIUM"
                  : `₦${course.price.toLocaleString()}`}
            </span>
            {course.featured && (
              <span className="rounded-full bg-foreground/85 px-2 py-1 text-[9px] font-black text-background">
                FEATURED
              </span>
            )}
          </div>
          {enrollment && (
            <div className="absolute bottom-2 left-3 right-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-black/15">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${enrollment.progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-brand">
              {course.category}
            </span>
            <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <Clock3 className="h-3 w-3" />
              {course.duration}
            </span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-sm font-black leading-5">{course.title}</h3>
          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted-foreground">
            {course.shortDescription}
          </p>
          <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
            <span>{course.difficulty}</span>
            <span>{course.language}</span>
          </div>
          {enrollment && (
            <p className="mt-2 flex items-center gap-1 text-[10px] font-black text-brand">
              {enrollment.progressPercent === 100 ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Completed
                </>
              ) : (
                <>
                  <PlayCircle className="h-3 w-3" />
                  {enrollment.progressPercent}% complete
                </>
              )}
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}

function LearnSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-40 animate-pulse rounded-3xl bg-muted" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-64 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="rounded-3xl border border-dashed border-brand/30 bg-card p-10 text-center">
      <LockKeyhole className="mx-auto h-8 w-8 text-brand" />
      <h2 className="mt-3 text-base font-black">Goall26 Learn is unavailable</h2>
      <p className="mt-2 text-xs text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 min-h-10 rounded-xl bg-brand px-4 text-xs font-black text-brand-foreground"
      >
        Try again
      </button>
    </section>
  );
}
function EmptyLearn({ onClear }: { onClear: () => void }) {
  return (
    <section className="rounded-3xl border border-dashed border-brand/30 bg-card p-10 text-center">
      <BookOpen className="mx-auto h-8 w-8 text-brand" />
      <h2 className="mt-3 text-base font-black">No courses match this search</h2>
      <p className="mt-2 text-xs text-muted-foreground">
        Try another topic or choose a different category.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 min-h-10 rounded-xl border border-border px-4 text-xs font-black"
      >
        Clear search
      </button>
    </section>
  );
}
