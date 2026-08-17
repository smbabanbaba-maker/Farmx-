import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Briefcase,
  ArrowLeft,
  Plus,
  X,
  MapPin,
  DollarSign,
  Clock,
  Building2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronRight,
  Info,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";
import { useProfileData } from "@/lib/use-profile";
import { createJob } from "@/lib/job.functions";
import { NIGERIA_STATES_LGAS } from "@/lib/nigeria-locations";
import type { JobCategory, JobType, WorkMode, ExperienceLevel, SalaryType } from "@/lib/job.types";

export const Route = createFileRoute("/post-job")({ component: PostJob });

const JOB_CATEGORIES: JobCategory[] = [
  "Agriculture",
  "Livestock",
  "Poultry",
  "Farm Operations",
  "Software / IT",
  "Solar / Renewable Energy",
  "Engineering / Technicians",
  "Drivers / Logistics",
  "Construction",
  "Marketing",
  "Sales",
  "Education / Teaching",
  "Finance / Business",
  "Administration",
  "Other",
];

const JOB_TYPES: JobType[] = [
  "Full-time",
  "Part-time",
  "Contract",
  "Temporary",
  "Internship",
  "Freelance",
];
const WORK_MODES: WorkMode[] = ["On-site", "Remote", "Hybrid"];
const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  "No Experience",
  "Entry Level",
  "Junior",
  "Intermediate",
  "Senior",
  "Expert",
];
const SALARY_TYPES: SalaryType[] = [
  "Negotiable",
  "Fixed Salary",
  "Salary Range",
  "Monthly",
  "Daily",
  "Weekly",
];

function PostJob() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { isLoggedIn, loading: authLoading } = useAuth();
  const { profile } = useProfileData();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Agriculture" as JobCategory,
    jobType: "Full-time" as JobType,
    workMode: "On-site" as WorkMode,
    experienceLevel: "Entry Level" as ExperienceLevel,
    location: "",
    state: "",
    lga: "",
    salaryType: "Negotiable" as SalaryType,
    salaryMin: undefined as number | undefined,
    salaryMax: undefined as number | undefined,
    salaryAmount: undefined as number | undefined,
    vacancies: 1,
    deadline: "",
    skillsRequired: [] as string[],
    newSkill: "",
  });

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      navigate({ to: "/login", search: { returnTo: "/post-job" } });
    }
  }, [authLoading, isLoggedIn, navigate]);

  useEffect(() => {
    if (profile && !form.state) {
      setForm((prev) => ({
        ...prev,
        state: profile.state || "",
        location: profile.location || "",
      }));
    }
  }, [profile]);

  const addSkill = () => {
    if (form.newSkill.trim() && !form.skillsRequired.includes(form.newSkill.trim())) {
      setForm((prev) => ({
        ...prev,
        skillsRequired: [...prev.skillsRequired, prev.newSkill.trim()],
        newSkill: "",
      }));
    }
  };

  const removeSkill = (skill: string) => {
    setForm((prev) => ({
      ...prev,
      skillsRequired: prev.skillsRequired.filter((s) => s !== skill),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.category || !form.state) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createJob({
        data: {
          job: {
            ...form,
            salaryCurrency: "NGN",
            status: "published",
          },
        },
      });
      navigate({
        to: "/jobs",
        search: { q: undefined, category: undefined, tab: undefined },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post job. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const NIGERIA_STATES = Object.keys(NIGERIA_STATES_LGAS).sort();

  return (
    <AppShell title="Post a Job">
      <div className="mx-auto max-w-2xl space-y-8 pb-20">
        <div className="flex items-center gap-3">
          <Link to="/post" className="rounded-full p-2 hover:bg-accent transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-black tracking-tight">Post a Job Opening</h1>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 p-4 text-sm font-bold text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section: Basic Info */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-brand">
              <Building2 className="h-5 w-5" />
              <h2 className="font-black uppercase tracking-wider text-xs">Basic Information</h2>
            </div>

            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Job Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Farm Manager, Tractor Driver..."
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-bold focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Category *
                  </label>
                  <select
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-bold outline-none"
                    value={form.category}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, category: e.target.value as JobCategory }))
                    }
                  >
                    {JOB_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Job Type *
                  </label>
                  <select
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-bold outline-none"
                    value={form.jobType}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, jobType: e.target.value as JobType }))
                    }
                  >
                    {JOB_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Description */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-brand">
              <Info className="h-5 w-5" />
              <h2 className="font-black uppercase tracking-wider text-xs">Job Details</h2>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Description *
              </label>
              <textarea
                required
                rows={5}
                placeholder="Describe the role, responsibilities, and what you're looking for..."
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-bold focus:border-brand focus:ring-1 focus:ring-brand outline-none resize-none"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </section>

          {/* Section: Location */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-brand">
              <MapPin className="h-5 w-5" />
              <h2 className="font-black uppercase tracking-wider text-xs">Location</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  State *
                </label>
                <select
                  required
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-bold outline-none"
                  value={form.state}
                  onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value, lga: "" }))}
                >
                  <option value="">Select State</option>
                  {NIGERIA_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  LGA
                </label>
                <select
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-bold outline-none"
                  value={form.lga}
                  onChange={(e) => setForm((prev) => ({ ...prev, lga: e.target.value }))}
                  disabled={!form.state}
                >
                  <option value="">Select LGA</option>
                  {form.state &&
                    NIGERIA_STATES_LGAS[form.state as keyof typeof NIGERIA_STATES_LGAS]?.map(
                      (l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ),
                    )}
                </select>
              </div>
            </div>
          </section>

          {/* Section: Salary */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-brand">
              <DollarSign className="h-5 w-5" />
              <h2 className="font-black uppercase tracking-wider text-xs">Compensation</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Salary Type
                </label>
                <select
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-bold outline-none"
                  value={form.salaryType}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, salaryType: e.target.value as SalaryType }))
                  }
                >
                  {SALARY_TYPES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {form.salaryType === "Fixed Salary" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Amount (₦)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-bold outline-none"
                    value={form.salaryAmount || ""}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, salaryAmount: Number(e.target.value) }))
                    }
                  />
                </div>
              )}
            </div>
          </section>

          {/* Section: Skills */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-brand">
              <Sparkles className="h-5 w-5" />
              <h2 className="font-black uppercase tracking-wider text-xs">Skills & Requirements</h2>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a skill (e.g. Tractor Operation)"
                  className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-bold outline-none"
                  value={form.newSkill}
                  onChange={(e) => setForm((prev) => ({ ...prev, newSkill: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="rounded-2xl bg-brand px-4 py-3 text-brand-foreground hover:bg-brand/90"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.skillsRequired.map((skill) => (
                  <span
                    key={skill}
                    className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-bold"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-3xl bg-brand py-4 text-base font-black text-brand-foreground shadow-lg transition-all hover:bg-brand/90 hover:shadow-xl disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Publish Job Opening
              </>
            )}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
