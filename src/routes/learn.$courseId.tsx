import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  LockKeyhole,
  PlayCircle,
  ShieldCheck,
  Trophy,
  UserRound,
  Video,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getMyProfile } from "@/lib/profile.functions";
import {
  getLearnRuntimeMode,
  getLearnCourseById,
  enrollInFreeLearnCourse,
  updateLearnProgress,
} from "@/lib/learn.functions";
import { getLearnRepository } from "@/lib/learn-repository";
import type { Course, CourseEnrollment, Lesson } from "@/lib/learn.types";
import { breadcrumbJsonLd, courseJsonLd, createSeoHead, truncateDescription } from "@/lib/seo";

export const Route = createFileRoute("/learn/$courseId")({
  loader: async ({ params }) => {
    const repository = await getLearnRepository();
    const candidate = await repository.getCourseById(params.courseId);
    return { course: candidate?.status === "published" ? candidate : null };
  },
  head: ({ params, loaderData }) => {
    const course = loaderData?.course;
    if (!course) {
      return createSeoHead({
        title: "Course unavailable | FarmX Learn",
        description: "This public FarmX Learn course is unavailable or has been removed.",
        path: `/learn/${encodeURIComponent(params.courseId)}`,
        noindex: true,
      });
    }
    return createSeoHead({
      title: `${course.title} | FarmX Learn`,
      description: truncateDescription(course.shortDescription || course.fullDescription),
      path: `/learn/${encodeURIComponent(course.id)}`,
      image: course.coverImage,
      keywords: [course.title, course.category, course.subcategory, course.language, "FarmX Learn"],
      jsonLd: [
        courseJsonLd(course),
        breadcrumbJsonLd([
          { name: "FarmX Learn", path: "/learn" },
          { name: course.category, path: `/learn?category=${encodeURIComponent(course.category)}` },
          { name: course.title, path: `/learn/${encodeURIComponent(course.id)}` },
        ]),
      ],
    });
  },
  component: LearnCourseDetail,
});

type FormValues = {
  fullName: string;
  phone: string;
  email: string;
  state: string;
  lga: string;
  city: string;
  occupation: string;
  educationLevel: string;
  experience: string;
};

function LearnCourseDetail() {
  const { courseId } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(loaderData.course);
  const [enrollment, setEnrollment] = useState<CourseEnrollment | null>(null);
  const [mode, setMode] = useState<"preview" | "production">("preview");
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<FormValues>({
    fullName: "",
    phone: "",
    email: "",
    state: "",
    lga: "",
    city: "",
    occupation: "",
    educationLevel: "",
    experience: "",
  });
  const [loading, setLoading] = useState(!loaderData.course);
  const [action, setAction] = useState<
    "idle" | "enrolling" | "success" | "payment_required" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [runtime, profileResult] = await Promise.all([
          getLearnRuntimeMode().catch(() => ({ mode: "preview" as const })),
          getMyProfile().catch(() => null),
        ]);
        const nextMode = runtime.mode;
        const repository = await getLearnRepository();
        const [nextCourse, nextEnrollment] = await Promise.all([
          nextMode === "production"
            ? getLearnCourseById({ data: { courseId } })
            : repository.getCourseById(courseId),
          nextMode === "production"
            ? repository.getEnrollment("preview-user", courseId)
            : repository.getEnrollment("preview-user", courseId),
        ]);
        if (cancelled) return;
        setMode(nextMode);
        setCourse(nextCourse?.status === "published" ? nextCourse : null);
        setEnrollment(nextEnrollment);
        if (nextCourse?.modules[0]) setOpenModules({ [nextCourse.modules[0].id]: true });
        const profile = profileResult?.profile;
        setForm({
          fullName: profile?.fullName ?? "",
          phone: profile?.phone ?? "",
          email: profile?.email ?? "",
          state: profile?.state ?? "",
          lga: "",
          city: profile?.location ?? "",
          occupation: "",
          educationLevel: "",
          experience: "",
        });
      } catch {
        if (!cancelled) setMessage("Unable to load this course.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const lessons = useMemo(
    () => course?.modules.flatMap((module) => module.lessons) ?? [],
    [course],
  );
  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? lessons[0] ?? null;
  const canAccess = (lesson: Lesson) => {
    if (!course) return false;
    if (course.accessType === "FREE" || course.accessType === "PREMIUM")
      return Boolean(enrollment) || Boolean(lesson.freePreview);
    return Boolean(enrollment) || Boolean(lesson.freePreview);
  };

  const openLesson = (lesson: Lesson) => {
    if (!canAccess(lesson)) {
      setMessage(
        "This lesson is locked. Complete registration and verified payment to unlock the full course.",
      );
      setAction("payment_required");
      return;
    }
    setActiveLessonId(lesson.id);
    setMessage("");
  };

  const completeLesson = async () => {
    if (!activeLesson || !enrollment) return;
    try {
      const updated =
        mode === "production"
          ? await updateLearnProgress({
              data: { enrollmentId: enrollment.id, lessonId: activeLesson.id },
            })
          : await (await getLearnRepository()).updateProgress(enrollment.id, activeLesson.id);
      setEnrollment(updated);
      setMessage(
        updated.progressPercent === 100
          ? "Course completed. Your certificate is ready to issue."
          : "Progress saved.",
      );
    } catch {
      setMessage("Progress could not be saved. Please try again.");
    }
  };

  const submitRegistration = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!course) return;
    if (!form.fullName.trim() || !form.phone.trim() || !form.email.trim() || !form.state.trim()) {
      setMessage("Please complete full name, phone, email, and state.");
      setAction("error");
      return;
    }
    setAction("enrolling");
    setMessage("");
    try {
      const registrationDetails = { ...form, customAnswers: {} };
      if (course.accessType !== "FREE") {
        setAction("payment_required");
        setRegistrationOpen(false);
        setMessage(
          "Your details are ready. Continue to verified payment; the course will remain locked until payment is confirmed by FarmX.",
        );
        return;
      }
      const nextEnrollment =
        mode === "production"
          ? await enrollInFreeLearnCourse({
              data: { courseId: course.id, registrationDetails },
            })
          : await (
              await getLearnRepository()
            ).enrollUser({
              userId: "preview-user",
              courseId: course.id,
              status: "active",
              registrationDetails,
            });
      setEnrollment(nextEnrollment);
      setRegistrationOpen(false);
      setAction("success");
      setMessage("Enrollment successful. You can now start learning.");
    } catch (error) {
      setAction("error");
      setMessage(error instanceof Error ? error.message : "Enrollment could not be completed.");
    }
  };

  if (loading)
    return (
      <AppShell title="FarmX Learn">
        <div className="space-y-4">
          <div className="h-56 animate-pulse rounded-3xl bg-muted" />
          <div className="h-10 animate-pulse rounded-xl bg-muted" />
          <div className="h-72 animate-pulse rounded-2xl bg-muted" />
        </div>
      </AppShell>
    );
  if (!course)
    return (
      <AppShell title="FarmX Learn">
        <section className="rounded-3xl border border-dashed border-brand/30 bg-card p-10 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-brand" />
          <h1 className="mt-3 text-lg font-black">Course not found</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            This course may be unpublished or no longer available.
          </p>
          <Link
            to="/learn"
            search={{ q: "", category: undefined }}
            className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-brand px-4 text-xs font-black text-brand-foreground"
          >
            Back to Learn
          </Link>
        </section>
      </AppShell>
    );

  return (
    <AppShell title="FarmX Learn">
      <div className="space-y-6 pb-8">
        <Link
          to="/learn"
          search={{ q: "", category: undefined }}
          className="inline-flex min-h-10 items-center gap-2 text-xs font-black text-brand"
        >
          <ArrowLeft className="h-4 w-4" /> FarmX Learn
        </Link>
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="relative flex min-h-52 items-center justify-center bg-gradient-to-br from-brand/20 via-accent to-brand/5 text-8xl">
            <span aria-hidden="true">{course.coverImage}</span>
            <div className="absolute left-4 top-4 flex gap-2">
              <span className="rounded-full bg-brand px-3 py-1.5 text-[10px] font-black text-brand-foreground">
                {course.accessType === "FREE"
                  ? "FREE"
                  : course.accessType === "PREMIUM"
                    ? "PREMIUM"
                    : `₦${course.price.toLocaleString()}`}
              </span>
              <span className="rounded-full bg-background/90 px-3 py-1.5 text-[10px] font-black">
                {course.difficulty}
              </span>
            </div>
          </div>
          <div className="space-y-4 p-5 sm:p-7">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand">
                {course.category} · {course.subcategory}
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                {course.title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {course.fullDescription}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-bold text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5">
                <Clock3 className="h-3 w-3" /> {course.duration}
              </span>
              <span className="rounded-full bg-muted px-3 py-1.5">{course.language}</span>
              <span className="rounded-full bg-muted px-3 py-1.5">
                {course.courseType.replace("_", " ")}
              </span>
              {course.certificateEligibility && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1.5 text-brand">
                  <Award className="h-3 w-3" /> Certificate eligible
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRegistrationOpen(true)}
                className="min-h-12 rounded-xl bg-brand px-5 text-xs font-black text-brand-foreground"
              >
                {enrollment
                  ? "Continue learning"
                  : course.accessType === "FREE"
                    ? "Enroll for free"
                    : `Enroll · ₦${course.price.toLocaleString()}`}
              </button>
              <span className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border px-4 text-[10px] font-bold text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-brand" /> Secure FarmX enrollment
              </span>
            </div>
            {message && (
              <div
                className={`rounded-2xl border p-3 text-xs ${action === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-brand/20 bg-brand/5 text-foreground"}`}
              >
                {message}
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="space-y-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand">
                Course curriculum
              </p>
              <h2 className="mt-1 text-lg font-black">
                {course.modules.length} modules · {lessons.length} lessons
              </h2>
            </div>
            {course.modules.map((module) => (
              <div
                key={module.id}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenModules((current) => ({
                      ...current,
                      [module.id]: !current[module.id],
                    }))
                  }
                  className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left"
                >
                  <span>
                    <span className="block text-sm font-black">{module.title}</span>
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      {module.summary}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${openModules[module.id] ? "rotate-180" : ""}`}
                  />
                </button>
                {openModules[module.id] && (
                  <div className="border-t border-border">
                    {module.lessons.map((lesson) => {
                      const allowed = canAccess(lesson);
                      const complete = enrollment?.completedLessonIds.includes(lesson.id);
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => openLesson(lesson)}
                          className={`flex min-h-14 w-full items-center gap-3 px-4 text-left transition hover:bg-muted/50 ${activeLesson?.id === lesson.id ? "bg-brand/5" : ""}`}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${complete ? "bg-green-100 text-green-700" : allowed ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground"}`}
                          >
                            {complete ? (
                              <Check className="h-4 w-4" />
                            ) : lesson.type === "video" ? (
                              <Video className="h-4 w-4" />
                            ) : lesson.type === "quiz" ? (
                              <Trophy className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-black">
                              {lesson.title}
                            </span>
                            <span className="mt-1 block text-[10px] text-muted-foreground">
                              {lesson.durationMinutes} minutes{" "}
                              {lesson.freePreview && "· Free preview"}
                            </span>
                          </span>
                          {allowed ? (
                            <PlayCircle className="h-4 w-4 text-brand" />
                          ) : (
                            <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-brand">
                Instructor
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-xs font-black text-brand">
                  {course.instructor.avatar}
                </div>
                <div>
                  <p className="text-sm font-black">{course.instructor.name}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {course.instructor.title}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {course.instructor.bio}
              </p>
            </section>
            <section className="rounded-2xl border border-brand/20 bg-brand/5 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand" />
                <p className="text-xs font-black">Official FarmX content</p>
              </div>
              <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
                Only authorized FarmX instructors and content managers can publish courses. Your
                enrollment and progress stay connected to your FarmX account.
              </p>
            </section>
            {enrollment && (
              <section className="rounded-2xl border border-border bg-card p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand">
                  Your progress
                </p>
                <p className="mt-2 text-2xl font-black">{enrollment.progressPercent}%</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${enrollment.progressPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  {enrollment.status === "completed"
                    ? "Completed"
                    : "Keep going — your progress is saved."}
                </p>
              </section>
            )}
          </aside>
        </div>

        {activeLesson && canAccess(activeLesson) && (
          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand">
                  Now learning
                </p>
                <h2 className="mt-1 text-xl font-black">{activeLesson.title}</h2>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-[10px] font-bold text-muted-foreground">
                <Clock3 className="h-3 w-3" /> {activeLesson.durationMinutes} min
              </span>
            </div>
            {activeLesson.type === "video" && activeLesson.videoUrl ? (
              <video
                controls
                className="mt-5 aspect-video w-full rounded-2xl bg-black"
                src={activeLesson.videoUrl}
              />
            ) : (
              <div className="mt-5 rounded-2xl bg-muted/50 p-5 text-sm leading-7 text-foreground">
                {activeLesson.content}
              </div>
            )}
            {activeLesson.type === "quiz" && activeLesson.quiz && (
              <QuizBlock quiz={activeLesson.quiz} />
            )}
            {enrollment && (
              <button
                type="button"
                onClick={() => void completeLesson()}
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-xs font-black text-brand-foreground"
              >
                <CheckCircle2 className="h-4 w-4" /> Mark lesson complete
              </button>
            )}
          </section>
        )}

        {registrationOpen && (
          <RegistrationModal
            course={course}
            form={form}
            setForm={setForm}
            onClose={() => setRegistrationOpen(false)}
            onSubmit={submitRegistration}
            action={action}
          />
        )}
      </div>
    </AppShell>
  );
}

function QuizBlock({ quiz }: { quiz: NonNullable<Lesson["quiz"]> }) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  return (
    <div className="mt-5 rounded-2xl border border-brand/20 bg-brand/5 p-4">
      <p className="text-xs font-black">Quick check</p>
      {quiz.map((item, index) => (
        <div key={index} className="mt-3">
          <p className="text-sm font-bold">{item.question}</p>
          <div className="mt-2 grid gap-2">
            {item.options.map((option, optionIndex) => (
              <button
                type="button"
                key={option}
                onClick={() => setSelected(optionIndex)}
                className={`min-h-10 rounded-xl border px-3 text-left text-xs font-semibold ${selected === optionIndex ? (optionIndex === item.correctIndex ? "border-green-500 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-700") : "border-border bg-card"}`}
              >
                {option}
              </button>
            ))}
          </div>
          {answered && (
            <p className="mt-3 text-xs text-muted-foreground">
              {selected === item.correctIndex ? "Correct. " : "Review this point. "}
              {item.explanation}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function RegistrationModal({
  course,
  form,
  setForm,
  onClose,
  onSubmit,
  action,
}: {
  course: Course;
  form: FormValues;
  setForm: React.Dispatch<React.SetStateAction<FormValues>>;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  action: string;
}) {
  const update = (key: keyof FormValues, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand">
              {course.accessType === "FREE" ? "Free enrollment" : "Course registration"}
            </p>
            <h2 className="mt-1 text-xl font-black">Confirm your details</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              We prefilled your FarmX profile where available. Review before continuing.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-muted"
            aria-label="Close enrollment form"
          >
            ×
          </button>
        </div>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Full name"
              required
              value={form.fullName}
              onChange={(value) => update("fullName", value)}
            />
            <Field
              label="Phone number"
              required
              value={form.phone}
              onChange={(value) => update("phone", value)}
            />
            <Field
              label="Email"
              required
              type="email"
              value={form.email}
              onChange={(value) => update("email", value)}
            />
            <Field
              label="State"
              required
              value={form.state}
              onChange={(value) => update("state", value)}
            />
            <Field label="LGA" value={form.lga} onChange={(value) => update("lga", value)} />
            <Field
              label="City/Area"
              value={form.city}
              onChange={(value) => update("city", value)}
            />
            <Field
              label="Occupation"
              value={form.occupation}
              onChange={(value) => update("occupation", value)}
            />
            <Field
              label="Educational level"
              value={form.educationLevel}
              onChange={(value) => update("educationLevel", value)}
            />
          </div>
          <label className="block text-xs font-bold text-muted-foreground">
            Relevant experience
            <textarea
              value={form.experience}
              onChange={(event) => update("experience", event.target.value)}
              className="mt-1 min-h-20 w-full rounded-xl border border-border bg-background p-3 text-xs font-semibold outline-none focus:border-brand"
              placeholder="Tell us briefly about your experience"
            />
          </label>
          <div className="rounded-2xl border border-brand/20 bg-brand/5 p-3 text-xs">
            <div className="flex items-center gap-2 font-black">
              <UserRound className="h-4 w-4 text-brand" />{" "}
              {course.accessType === "FREE"
                ? "No payment is required"
                : `Course fee: ₦${course.price.toLocaleString()}`}
            </div>
            <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
              {course.accessType === "FREE"
                ? "You will be enrolled after confirming these details."
                : "After confirmation, FarmX will take you through verified payment. Clicking Pay never unlocks a course by itself."}
            </p>
          </div>
          <button
            type="submit"
            disabled={action === "enrolling"}
            className="min-h-12 w-full rounded-xl bg-brand px-4 text-xs font-black text-brand-foreground disabled:opacity-60"
          >
            {action === "enrolling"
              ? "Processing…"
              : course.accessType === "FREE"
                ? "Complete registration"
                : "Continue to verified payment"}
          </button>
        </form>
      </div>
    </div>
  );
}
function Field({
  label,
  required,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs font-bold text-muted-foreground">
      {label}
      {required && " *"}
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground outline-none focus:border-brand"
      />
    </label>
  );
}
