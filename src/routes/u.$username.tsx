import { createFileRoute, Link } from "@tanstack/react-router";
import { getPublicProfile, getPublicProfilePhotoUrl } from "@/lib/profile.functions";
import { toggleCommunityFollow } from "@/lib/community.functions";
import { useAuth } from "@/lib/use-auth";
import {
  breadcrumbJsonLd,
  createSeoHead,
  publicProfileJsonLd,
  truncateDescription,
} from "@/lib/seo";
import {
  BadgeCheck,
  MapPin,
  ShieldCheck,
  UserPlus,
  UserMinus,
  MessageCircle,
  Flag,
  Ban,
} from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/u/$username")({
  loader: async ({ params }) => {
    try {
      const data = await getPublicProfile({ data: { username: params.username } });
      const photo = data.profile.photoKey
        ? await getPublicProfilePhotoUrl({ data: { username: params.username } })
        : { downloadUrl: null };
      return { data, photoUrl: photo.downloadUrl };
    } catch {
      return { data: null, photoUrl: null };
    }
  },
  head: ({ params, loaderData }) => {
    const data = loaderData?.data;
    if (!data) {
      return createSeoHead({
        title: "Profile unavailable | Goall26",
        description: "This public Goall26 profile is unavailable or private.",
        path: `/u/${encodeURIComponent(params.username)}`,
        noindex: true,
      });
    }
    const profile = data.profile;
    return createSeoHead({
      title: `${profile.fullName} | Goall26 public profile`,
      description: truncateDescription(
        profile.bio ||
          `${profile.fullName} is a public Goall26 ${profile.role} profile in ${profile.state}.`,
      ),
      path: `/u/${encodeURIComponent(profile.username)}`,
      image: loaderData.photoUrl ?? undefined,
      keywords: [profile.fullName, profile.role, profile.state, ...profile.agriculturalInterests],
      jsonLd: [
        publicProfileJsonLd({
          fullName: profile.fullName,
          username: profile.username,
          role: profile.role,
          bio: profile.bio,
          state: profile.state,
          location: profile.location,
          photoUrl: loaderData.photoUrl,
          verification: profile.verification,
        }),
        breadcrumbJsonLd([
          { name: "Goall26", path: "/" },
          { name: "Public profiles", path: "/search" },
          { name: profile.fullName, path: `/u/${encodeURIComponent(profile.username)}` },
        ]),
      ],
    });
  },
  component: PublicProfile,
});

type PublicProfileData = {
  profile: {
    userId: string;
    fullName: string;
    username: string;
    role: string;
    bio: string;
    state: string;
    location: string;
    agriculturalInterests: string[];
    photoKey?: string;
    verification: string;
  };
  stats: {
    activeAds: number;
    followers: number | null;
    rating: number | null;
    reviews: number | null;
  };
};

function PublicProfile() {
  const { username } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const [data, setData] = useState<PublicProfileData | null>(loaderData.data);
  const [photoUrl, setPhotoUrl] = useState<string | null>(loaderData.photoUrl);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    let active = true;
    setData(null);
    setPhotoUrl(null);
    setError(null);
    void (async () => {
      try {
        const result = await getPublicProfile({ data: { username } });
        if (!active) return;
        setData(result);
        if (result.profile.photoKey) {
          const photo = await getPublicProfilePhotoUrl({ data: { username } });
          if (active) setPhotoUrl(photo.downloadUrl);
        }
      } catch (reason) {
        if (active)
          setError(
            reason instanceof Error ? reason.message : "This Goall26 profile is unavailable.",
          );
      }
    })();
    return () => {
      active = false;
    };
  }, [username]);

  if (error)
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
  if (!data)
    return (
      <PublicShell>
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      </PublicShell>
    );

  const { profile, stats } = data;
  const initials = profile.fullName
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const toggleFollow = async () => {
    if (!isLoggedIn) {
      window.location.assign(`/login?returnTo=${encodeURIComponent(`/u/${username}`)}`);
      return;
    }
    setFollowBusy(true);
    try {
      const result = await toggleCommunityFollow({
        data: { targetUserId: profile.userId, targetUsername: profile.username },
      });
      setFollowing(result.following);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update follow status.");
    } finally {
      setFollowBusy(false);
    }
  };

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
      <section className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-3">
        <button
          type="button"
          onClick={() => void toggleFollow()}
          disabled={followBusy}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2.5 text-xs font-bold text-brand-foreground disabled:opacity-60"
        >
          {following ? <UserMinus className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
          {followBusy ? "Updating…" : following ? "Following" : "Follow"}
        </button>
        <Link
          to="/messages"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-xs font-bold"
        >
          <MessageCircle className="h-3.5 w-3.5" /> Message
        </Link>
        <Link
          to="/reports"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-xs font-bold text-muted-foreground"
        >
          <Flag className="h-3.5 w-3.5" /> Report
        </Link>
        <button
          type="button"
          onClick={() =>
            window.alert(
              "This profile has been blocked on this device. Account-level blocking is available from Safety & Trust.",
            )
          }
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-xs font-bold text-muted-foreground"
        >
          <Ban className="h-3.5 w-3.5" /> Block
        </button>
      </section>
      <section className="grid grid-cols-3 gap-2">
        <Metric label="Active ads" value={stats.activeAds} />
        {stats.followers !== null && <Metric label="Followers" value={stats.followers} />}
        {stats.reviews !== null && <Metric label="Reviews" value={stats.reviews} />}
      </section>
      <section className="rounded-2xl border border-brand/20 bg-brand/5 p-4">
        <p className="text-xs font-bold text-brand">Goall26 safety reminder</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Goall26 connects buyers and sellers. Agree directly with the profile owner and follow
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
          Goall26
        </Link>
        {children}
      </div>
    </main>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
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
