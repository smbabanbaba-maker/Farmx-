import { createFileRoute, Link } from "@tanstack/react-router";
import { getPublicProfile, getPublicProfilePhotoUrl } from "@/lib/profile.functions";
import { BadgeCheck, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/u/$username")({ component: PublicProfile });

type PublicData = Awaited<ReturnType<typeof getPublicProfile>>;

function PublicProfile() {
  const { username } = Route.useParams();
  const [data, setData] = useState<PublicData | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setData(null);
    setPhotoUrl(null);
    setError(null);

    void getPublicProfile({ data: { username } })
      .then(async (result) => {
        if (!active) return;
        setData(result);
        if (result.profile.photoKey) {
          const photo = await getPublicProfilePhotoUrl({ data: { username } });
          if (active) setPhotoUrl(photo.downloadUrl);
        }
      })
      .catch((reason) => {
        if (active)
          setError(reason instanceof Error ? reason.message : "This FarmX profile is unavailable.");
      });

    return () => {
      active = false;
    };
  }, [username]);

  if (error) {
    return (
      <PublicShell>
        <section className="rounded-2xl border border-border bg-card p-7 text-center">
          <ShieldCheck className="mx-auto h-9 w-9 text-brand" />
          <h1 className="mt-3 text-lg font-bold">Profile unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{error}</p>
          <Link
            to="/market"
            className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-brand-foreground"
          >
            Browse Market
          </Link>
        </section>
      </PublicShell>
    );
  }

  if (!data) {
    return (
      <PublicShell>
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      </PublicShell>
    );
  }

  const { profile, stats } = data;
  const initials = profile.fullName
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <PublicShell>
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="h-24 bg-gradient-to-r from-brand via-brand to-red-800" />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-brand/10 text-xl font-black text-brand shadow-sm">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={`${profile.fullName} profile`}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <h1 className="text-xl font-black">{profile.fullName}</h1>
            {profile.verification === "approved" && (
              <BadgeCheck className="h-4 w-4 text-brand" aria-label="Verified profile" />
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            @{profile.username} · {roleLabel(profile.role)}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {profile.location || profile.state}
          </p>
          {profile.bio && <p className="mt-4 text-sm leading-6">{profile.bio}</p>}
          {profile.agriculturalInterests.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.agriculturalInterests.map((interest) => (
                <span
                  key={interest}
                  className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-bold text-brand"
                >
                  {interest}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="grid grid-cols-3 gap-2">
        <PublicMetric label="Active ads" value={stats.activeAds} />
        {stats.followers !== null && <PublicMetric label="Followers" value={stats.followers} />}
        {stats.reviews !== null && <PublicMetric label="Reviews" value={stats.reviews} />}
      </section>
      <section className="rounded-2xl border border-brand/20 bg-brand/5 p-4">
        <p className="text-xs font-bold text-brand">FarmX safety reminder</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          FarmX connects buyers and sellers. Agree directly with the profile owner and follow
          safe-meeting guidance before any private transaction.
        </p>
      </section>
    </PublicShell>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-md space-y-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-black text-brand">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-xs text-brand-foreground">
            F
          </span>
          FarmX
        </Link>
        {children}
      </div>
    </main>
  );
}
function PublicMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className="font-black">{value.toLocaleString()}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
function roleLabel(role: string) {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
