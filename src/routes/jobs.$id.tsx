import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronLeft,
  MapPin,
  Bookmark,
  Share2,
  Calendar,
  GraduationCap,
  DollarSign,
  User,
  Phone,
  Mail,
  FileText,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getJobRepository } from "@/lib/job-repository";
import type { JobPost, JobApplication } from "@/lib/job.types";
import { toast } from "sonner";

export const Route = createFileRoute("/jobs/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
    category: typeof search.category === "string" ? search.category : undefined,
    tab: typeof search.tab === "string" ? search.tab : "explore",
  }),
  component: JobDetailView,
});

function JobDetailView() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobPost | null>(null);
  const [application, setApplication] = useState<JobApplication | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  // Application form state
  const [fullName, setFullName] = useState("Ibrahim Abubakar");
  const [email, setEmail] = useState("ibrahim@farmx.ng");
  const [phone, setPhone] = useState("+234 803 000 1122");
  const [location, setLocation] = useState("Kano, Nigeria");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const repo = await getJobRepository();
        const [nextJob, nextApps, nextSaved] = await Promise.all([
          repo.getJobById(id),
          repo.getApplications("preview-user"),
          repo.getSavedJobIds("preview-user"),
        ]);
        if (cancelled) return;
        setJob(nextJob);
        setApplication(nextApps.find((a) => a.jobId === id) || null);
        setSaved(nextSaved.includes(id));
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const toggleSave = async () => {
    const repo = await getJobRepository();
    const next = await repo.toggleSaveJob("preview-user", id);
    setSaved(next);
    toast.success(next ? "Job saved to your bookmarks" : "Job removed from bookmarks");
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    setSubmitting(true);
    try {
      const repo = await getJobRepository();
      const newApp = await repo.applyForJob({
        jobId: job.id,
        jobTitle: job.title,
        companyName: job.company,
        userId: "preview-user",
        applicantName: fullName,
        applicantEmail: email,
        applicantPhone: phone,
        applicantLocation: location,
      });
      setApplication(newApp);
      setApplying(false);
      toast.success("Application submitted successfully!");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-4 py-8">
          <div className="h-48 animate-pulse rounded-3xl bg-muted" />
          <div className="h-64 animate-pulse rounded-3xl bg-muted" />
        </div>
      </AppShell>
    );
  }

  if (!job) {
    return (
      <AppShell>
        <div className="rounded-3xl border border-border bg-card p-12 text-center space-y-4">
          <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="text-lg font-black">Job not found</h1>
          <p className="text-xs text-muted-foreground">
            This job may have expired or been removed.
          </p>
          <Link
            to="/jobs"
            search={{ q: "", category: undefined, tab: "explore" }}
            className="inline-block rounded-xl bg-brand px-5 py-2.5 text-xs font-black text-brand-foreground"
          >
            Back to Jobs
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={job.title}>
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <Link
            to="/jobs"
            search={{ q: "", category: undefined, tab: "explore" }}
            className="inline-flex items-center gap-1.5 text-xs font-black text-brand hover:underline"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Jobs
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSave}
              className="rounded-full border border-border p-2.5 bg-card hover:bg-muted"
              aria-label="Save job"
            >
              <Bookmark
                className={`h-4 w-4 ${saved ? "fill-brand text-brand" : "text-muted-foreground"}`}
              />
            </button>
            <button
              onClick={() => {
                void navigator.clipboard?.writeText(window.location.href);
                toast.success("Job link copied to clipboard!");
              }}
              className="rounded-full border border-border p-2.5 bg-card hover:bg-muted"
              aria-label="Share job"
            >
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <article className="rounded-3xl border border-border bg-card p-6 space-y-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand/10 px-3 py-1 text-[10px] font-black text-brand">
                  {job.category}
                </span>
                {job.featured && (
                  <span className="rounded-full bg-foreground text-background px-2.5 py-0.5 text-[10px] font-black">
                    FEATURED
                  </span>
                )}
              </div>
              <h1 className="mt-3 text-2xl font-black tracking-tight">{job.title}</h1>
              <p className="mt-1 text-sm font-bold text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-brand" /> {job.company}{" "}
                {job.employer.verified && (
                  <CheckCircle2 className="h-4 w-4 text-brand fill-brand/20" />
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-muted/50 p-4 sm:grid-cols-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Location
              </p>
              <p className="mt-0.5 text-xs font-black flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-brand" /> {job.location}, {job.state}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Salary
              </p>
              <p className="mt-0.5 text-xs font-black text-brand flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />{" "}
                {job.salaryType === "Fixed Salary" && job.salaryAmount
                  ? `₦${job.salaryAmount.toLocaleString()}`
                  : job.salaryType === "Salary Range" && job.salaryMin && job.salaryMax
                    ? `₦${job.salaryMin.toLocaleString()} - ₦${job.salaryMax.toLocaleString()}`
                    : job.salaryType}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Job Type
              </p>
              <p className="mt-0.5 text-xs font-black flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5 text-brand" /> {job.jobType} ({job.workMode})
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Deadline
              </p>
              <p className="mt-0.5 text-xs font-black flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-brand" /> {job.deadline}
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <h2 className="text-sm font-black mb-2">Job Description</h2>
              <p className="text-muted-foreground leading-relaxed">{job.description}</p>
            </div>

            {job.responsibilities?.length > 0 && (
              <div>
                <h2 className="text-sm font-black mb-2">Key Responsibilities</h2>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  {job.responsibilities.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {job.requirements?.length > 0 && (
              <div>
                <h2 className="text-sm font-black mb-2">Requirements & Qualifications</h2>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  {job.requirements.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>
            )}

            {job.skillsRequired?.length > 0 && (
              <div>
                <h2 className="text-sm font-black mb-2">Required Skills</h2>
                <div className="flex flex-wrap gap-1.5">
                  {job.skillsRequired.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-brand/10 px-3 py-1 font-bold text-brand"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border pt-6">
            {application ? (
              <div className="rounded-2xl bg-green-500/10 border border-green-500/20 p-5 text-center space-y-2">
                <CheckCircle2 className="mx-auto h-8 w-8 text-green-600" />
                <h3 className="text-sm font-black text-green-800">Application Submitted</h3>
                <p className="text-xs text-muted-foreground">
                  Status: <span className="font-bold text-brand">{application.status}</span>. You
                  can track this in My Applications.
                </p>
              </div>
            ) : applying ? (
              <form
                onSubmit={handleApply}
                className="space-y-4 rounded-2xl border border-border bg-muted/30 p-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black">Confirm Your Application Profile</h3>
                  <button
                    type="button"
                    onClick={() => setApplying(false)}
                    className="text-xs text-muted-foreground underline"
                  >
                    Cancel
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground">Full Name</label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="mt-1 min-h-11 w-full rounded-xl border border-border bg-card px-3 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="mt-1 min-h-11 w-full rounded-xl border border-border bg-card px-3 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground">
                      Phone Number
                    </label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="mt-1 min-h-11 w-full rounded-xl border border-border bg-card px-3 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground">
                      Current Location
                    </label>
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                      className="mt-1 min-h-11 w-full rounded-xl border border-border bg-card px-3 text-xs font-semibold"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-12 rounded-xl bg-brand text-brand-foreground font-black text-xs"
                >
                  {submitting ? "Submitting Application..." : "Submit Application"}
                </button>
              </form>
            ) : (
              <button
                onClick={() => setApplying(true)}
                className="w-full min-h-12 rounded-2xl bg-brand text-brand-foreground font-black text-sm shadow-lg shadow-brand/20 transition hover:bg-brand/90"
              >
                Apply for this Position
              </button>
            )}
          </div>
        </article>
      </div>
    </AppShell>
  );
}
