import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase, Building2, CheckCircle2, MapPin, Search, Bookmark, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getJobRepository } from "@/lib/job-repository";
import type { JobPost, JobCategory, JobApplication } from "@/lib/job.types";

const categories: { name: JobCategory; icon: string }[] = [
  { name: "Agriculture", icon: "🌾" },
  { name: "Livestock", icon: "🐄" },
  { name: "Poultry", icon: "🐔" },
  { name: "Farm Operations", icon: "🚜" },
  { name: "Software / IT", icon: "💻" },
  { name: "Solar / Renewable Energy", icon: "☀️" },
  { name: "Engineering / Technicians", icon: "🔧" },
  { name: "Drivers / Logistics", icon: "🚗" },
  { name: "Construction", icon: "🏗️" },
  { name: "Marketing", icon: "📱" },
  { name: "Sales", icon: "🛒" },
  { name: "Education / Teaching", icon: "👨‍🏫" },
  { name: "Finance / Business", icon: "📊" },
  { name: "Administration", icon: "🧑‍💼" },
  { name: "Other", icon: "✦" },
];

export const Route = createFileRoute("/jobs")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
    category: categories.some((c) => c.name === search.category)
      ? (search.category as JobCategory)
      : undefined,
    tab: typeof search.tab === "string" ? search.tab : "explore",
  }),
  component: JobsHome,
});

function JobsHome() {
  const { q, category, tab } = Route.useSearch();
  const navigate = useNavigate();
  const [search, setSearch] = useState(q);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const repo = await getJobRepository();
        const [nextJobs, nextApps, nextSaved] = await Promise.all([
          repo.getJobs({ search: q, category }),
          repo.getApplications("preview-user"),
          repo.getSavedJobIds("preview-user"),
        ]);
        if (cancelled) return;
        setJobs(nextJobs);
        setApplications(nextApps);
        setSavedIds(nextSaved);
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
  }, [q, category]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void navigate({ to: "/jobs", search: { q: search.trim(), category, tab } });
  };

  const selectCategory = (cat: JobCategory | undefined) => {
    void navigate({
      to: "/jobs",
      search: { q, category: category === cat ? undefined : cat, tab },
    });
  };

  const switchTab = (nextTab: string) => {
    void navigate({ to: "/jobs", search: { q, category, tab: nextTab } });
  };

  const savedJobsList = jobs.filter((j) => savedIds.includes(j.id));
  const appliedJobIds = new Set(applications.map((a) => a.jobId));

  return (
    <AppShell title="FarmX Jobs">
      <div className="space-y-6 pb-10">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand to-foreground p-5 text-brand-foreground shadow-lg sm:p-7">
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                  <Briefcase className="h-3.5 w-3.5" /> Employment Marketplace
                </span>
                <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                  Find your next opportunity or skilled talent.
                </h1>
                <p className="mt-2 text-xs text-white/80">
                  Connect with verified agricultural, technical, and professional employers across
                  Nigeria.
                </p>
              </div>
            </div>
            <form onSubmit={handleSearch} className="relative mt-5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs, skills, companies..."
                className="min-h-12 w-full rounded-2xl border border-white/20 bg-white pl-10 pr-20 text-xs font-semibold text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-white/40"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl bg-brand px-3.5 py-2 text-xs font-black text-brand-foreground"
              >
                Search
              </button>
            </form>
          </div>
        </section>

        <div className="flex border-b border-border gap-4 text-xs font-black">
          <button
            onClick={() => switchTab("explore")}
            className={`pb-2.5 border-b-2 ${tab === "explore" ? "border-brand text-brand" : "border-transparent text-muted-foreground"}`}
          >
            Explore Jobs ({jobs.length})
          </button>
          <button
            onClick={() => switchTab("applications")}
            className={`pb-2.5 border-b-2 ${tab === "applications" ? "border-brand text-brand" : "border-transparent text-muted-foreground"}`}
          >
            My Applications ({applications.length})
          </button>
          <button
            onClick={() => switchTab("saved")}
            className={`pb-2.5 border-b-2 ${tab === "saved" ? "border-brand text-brand" : "border-transparent text-muted-foreground"}`}
          >
            Saved ({savedIds.length})
          </button>
        </div>

        {tab === "explore" && (
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black">Categories</h2>
                {category && (
                  <button
                    onClick={() => selectCategory(undefined)}
                    className="text-[10px] font-bold text-brand underline"
                  >
                    Clear filter
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {categories.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => selectCategory(c.name)}
                    className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-center transition ${category === c.name ? "border-brand bg-brand text-brand-foreground" : "border-border bg-card hover:border-brand/50"}`}
                  >
                    <span className="text-xl" aria-hidden="true">
                      {c.icon}
                    </span>
                    <span className="text-[10px] font-black leading-tight">{c.name}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black">Latest Job Openings</h2>
                <span className="text-[10px] text-muted-foreground">
                  {jobs.length} jobs available
                </span>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
                  ))}
                </div>
              ) : jobs.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
                  <Briefcase className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-black">No jobs found</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try searching with different keywords or category.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {jobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      applied={appliedJobIds.has(job.id)}
                      saved={savedIds.includes(job.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === "applications" && (
          <div className="space-y-3">
            <h2 className="text-sm font-black">My Applications</h2>
            {applications.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
                <Briefcase className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-black">No applications yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Explore available jobs and apply with 1 click.
                </p>
              </div>
            ) : (
              applications.map((app) => (
                <div
                  key={app.id}
                  className="rounded-2xl border border-border bg-card p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black">{app.jobTitle}</p>
                      <p className="text-xs text-muted-foreground">{app.companyName}</p>
                    </div>
                    <span className="rounded-full bg-brand/10 px-3 py-1 text-[10px] font-black text-brand">
                      {app.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Applied on {new Date(app.appliedAt).toLocaleDateString()}
                  </p>
                  {app.interview && (
                    <div className="mt-2 rounded-xl bg-muted/50 p-3 text-xs space-y-1">
                      <p className="font-bold text-brand">Interview Scheduled</p>
                      <p>
                        Date: {app.interview.date} at {app.interview.time}
                      </p>
                      <p>Location/Link: {app.interview.locationOrLink}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "saved" && (
          <div className="space-y-3">
            <h2 className="text-sm font-black">Saved Jobs</h2>
            {savedJobsList.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
                <Bookmark className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-black">No saved jobs</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tap the bookmark icon on any job to save it here.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {savedJobsList.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    applied={appliedJobIds.has(job.id)}
                    saved={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function JobCard({ job, applied, saved }: { job: JobPost; applied: boolean; saved: boolean }) {
  const [isSaved, setIsSaved] = useState(saved);
  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    const repo = await getJobRepository();
    const next = await repo.toggleSaveJob("preview-user", job.id);
    setIsSaved(next);
  };

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition hover:border-brand/50 hover:shadow-md">
      <Link
        to="/jobs/$id"
        params={{ id: job.id }}
        search={{ q: "", category: undefined, tab: "explore" }}
        className="block space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[9px] font-black text-brand">
                {job.category}
              </span>
              {job.featured && (
                <span className="rounded-full bg-foreground text-background px-2 py-0.5 text-[9px] font-black">
                  FEATURED
                </span>
              )}
            </div>
            <h3 className="mt-2 text-sm font-black leading-snug group-hover:text-brand transition-colors">
              {job.title}
            </h3>
            <p className="mt-0.5 text-xs font-bold text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-brand" /> {job.company}{" "}
              {job.employer.verified && (
                <CheckCircle2 className="h-3 w-3 text-brand fill-brand/20" />
              )}
            </p>
          </div>
          <button
            onClick={toggleSave}
            className="rounded-full p-2 hover:bg-muted"
            aria-label="Save job"
          >
            <Bookmark
              className={`h-4 w-4 ${isSaved ? "fill-brand text-brand" : "text-muted-foreground"}`}
            />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-[10px] font-bold text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
            <MapPin className="h-3 w-3" /> {job.location}, {job.state}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1">{job.jobType}</span>
          <span className="rounded-full bg-muted px-2.5 py-1">{job.workMode}</span>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs font-black text-brand">
            {job.salaryType === "Fixed Salary" && job.salaryAmount
              ? `₦${job.salaryAmount.toLocaleString()} / mo`
              : job.salaryType === "Salary Range" && job.salaryMin && job.salaryMax
                ? `₦${job.salaryMin.toLocaleString()} - ₦${job.salaryMax.toLocaleString()}`
                : job.salaryType}
          </span>
          {applied ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-green-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Applied
            </span>
          ) : (
            <span className="text-[10px] font-black text-brand">View Details →</span>
          )}
        </div>
      </Link>
    </article>
  );
}
