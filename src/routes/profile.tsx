import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useProfileData } from "@/lib/use-profile";
import { useProfilePhoto } from "@/lib/use-profile-photo";
import {
  BadgeCheck,
  Bell,
  Building2,
  ChevronRight,
  CircleHelp,
  Heart,
  History,
  LayoutDashboard,
  MessageSquareText,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  Share2,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — FarmX" },
      {
        name: "description",
        content: "Manage your FarmX profile, advertisements, inquiries, services and settings.",
      },
    ],
  }),
  component: ProfilePage,
});

const sections = [
  {
    id: "ads",
    label: "My ads",
    description: "Active, drafts, paused and closed adverts",
    icon: LayoutDashboard,
  },
  {
    id: "promotions",
    label: "Pro sales",
    description: "Boosts, featured listings and campaigns",
    icon: Sparkles,
  },
  {
    id: "inquiries",
    label: "Buyer inquiries",
    description: "People who contacted you about an advert",
    icon: MessageSquareText,
  },
  {
    id: "interactions",
    label: "My interactions",
    description: "Recent chats, viewed ads and saved activity",
    icon: UsersRound,
  },
  {
    id: "saved",
    label: "Saved ads",
    description: "Listings you saved to revisit later",
    icon: Heart,
  },
  {
    id: "analytics",
    label: "Ad analytics",
    description: "Views, saves, contacts and promotion performance",
    icon: TrendingUp,
  },
  {
    id: "balance",
    label: "FarmX balance",
    description: "Payments for FarmX services only",
    icon: WalletCards,
  },
  {
    id: "services",
    label: "Premium services",
    description: "Subscription, limits and service receipts",
    icon: Sparkles,
  },
  {
    id: "reviews",
    label: "Ratings & reviews",
    description: "Feedback from verified FarmX interactions",
    icon: Star,
  },
  {
    id: "network",
    label: "Followers & following",
    description: "People and businesses you connect with",
    icon: UsersRound,
  },
  {
    id: "verification",
    label: "Seller verification",
    description: "Phone, email, identity and business status",
    icon: UserCheck,
  },
  {
    id: "business",
    label: "Business profile",
    description: "Your public agricultural business information",
    icon: Building2,
  },
  {
    id: "activity",
    label: "Profile activity",
    description: "Your adverts, services and account history",
    icon: History,
  },
  {
    id: "safety",
    label: "Safety & trust",
    description: "Safety guidance, reports and blocked users",
    icon: ShieldCheck,
  },
  {
    id: "support",
    label: "Help & support",
    description: "FAQ, support tickets and FarmX assistance",
    icon: CircleHelp,
  },
] as const;

function ProfilePage() {
  const { status, profile, stats, error, refresh } = useProfileData();
  const photoUrl = useProfilePhoto(profile?.photoKey);

  if (status === "loading") {
    return <ProfileLoading />;
  }

  if (status === "error") {
    return (
      <AppShell title="Profile">
        <section className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-5 text-center">
          <ShieldCheck className="mx-auto h-9 w-9 text-brand" />
          <h1 className="mt-3 text-lg font-bold">Your secure Profile is unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Sign in with your FarmX account and make sure the Profile service environment is
            configured before loading private profile data.
          </p>
          <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-left text-xs text-muted-foreground">
            {error}
          </p>
          <button
            onClick={() => void refresh()}
            className="mt-4 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-brand-foreground"
          >
            Retry Profile
          </button>
        </section>
      </AppShell>
    );
  }

  if (!profile || !stats) {
    return (
      <AppShell title="Profile">
        <section className="mx-auto max-w-lg rounded-2xl border border-dashed border-border bg-card p-6 text-center">
          <UserRound className="mx-auto h-10 w-10 text-brand" />
          <h1 className="mt-3 text-lg font-bold">Complete your FarmX Profile</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Add your verified identity, role, location and professional details to use Profile tools
            safely.
          </p>
          <Link
            to="/edit-profile"
            className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-brand-foreground"
          >
            Complete profile
          </Link>
        </section>
      </AppShell>
    );
  }

  const initials = profile.fullName
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const profileUrl =
    typeof window === "undefined"
      ? `/u/${profile.username}`
      : `${window.location.origin}/u/${profile.username}`;

  const shareProfile = async () => {
    const shareData = {
      title: `${profile.fullName} on FarmX`,
      text: `View ${profile.fullName}'s FarmX profile`,
      url: profileUrl,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(profileUrl);
    } catch {
      /* A user may cancel native share; no action is needed. */
    }
  };

  return (
    <AppShell title="Profile">
      <div className="space-y-4 pb-6">
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="h-20 bg-gradient-to-r from-brand via-brand to-red-800" />
          <div className="px-4 pb-4">
            <div className="-mt-9 flex items-end justify-between gap-3">
              <div className="flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-brand/10 text-xl font-black text-brand shadow-sm">
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
              <div className="flex gap-2 pb-1">
                <Link
                  to="/edit-profile"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-bold hover:border-brand"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Link>
                <button
                  onClick={() => void shareProfile()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-bold text-brand-foreground"
                >
                  <Share2 className="h-3.5 w-3.5" /> Share
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <h1 className="text-xl font-black">{profile.fullName}</h1>
              {profile.verification === "approved" && (
                <BadgeCheck className="h-4 w-4 text-brand" aria-label="Verified" />
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              @{profile.username} · {roleLabel(profile.role)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {profile.location || profile.state}
            </p>
            {profile.bio && <p className="mt-3 text-sm leading-6 text-foreground">{profile.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusPill
                label={verificationLabel(profile.verification)}
                tone={profile.verification === "approved" ? "success" : "neutral"}
              />
              <StatusPill label={`${stats.activeAds} active ads`} tone="brand" />
              {profile.agriculturalInterests.slice(0, 2).map((interest) => (
                <StatusPill key={interest} label={interest} tone="neutral" />
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Active ads" value={stats.activeAds} />
          <Metric label="Ad views" value={stats.totalAdViews} />
          <Metric label="Buyer inquiries" value={stats.buyerInquiries ?? "—"} />
          <Metric label="Saved ads" value={stats.savedAds ?? "—"} />
          <Metric label="Followers" value={stats.followers ?? "—"} />
          <Metric label="Following" value={stats.following ?? "—"} />
          <Metric label="Rating" value={stats.rating === null ? "—" : stats.rating.toFixed(1)} />
          <Metric label="Reviews" value={stats.reviews ?? "—"} />
        </section>

        <section className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="text-sm font-bold">Profile centre</h2>
              <p className="text-[11px] text-muted-foreground">
                Manage your FarmX activity and services
              </p>
            </div>
            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="divide-y divide-border">
            {sections.map((section) => (
              <Link
                key={section.id}
                to="/profile-center/$section"
                params={{ section: section.id }}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-accent/70 active:scale-[0.995]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <section.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{section.label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {section.description}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
            <Link
              to="/notifications"
              className="flex items-center gap-3 px-4 py-3 transition hover:bg-accent/70"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Bell className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Notifications</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  Profile, chat and service updates
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              to="/settings"
              className="flex items-center gap-3 px-4 py-3 transition hover:bg-accent/70"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Settings & privacy</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  Visibility, messaging, security and account controls
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function ProfileLoading() {
  return (
    <AppShell title="Profile">
      <div className="space-y-4 animate-pulse">
        <div className="h-56 rounded-2xl bg-muted" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-20 rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-80 rounded-2xl bg-muted" />
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className="text-lg font-black text-foreground">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "brand" | "success" | "neutral" }) {
  const styles = {
    brand: "bg-brand/10 text-brand",
    success: "bg-green-500/10 text-green-700 dark:text-green-400",
    neutral: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${styles[tone]}`}>
      {label}
    </span>
  );
}

function roleLabel(role: string) {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function verificationLabel(status: string) {
  return (
    {
      not_started: "Not verified",
      pending: "Verification pending",
      approved: "Verified",
      rejected: "Verification rejected",
      more_information: "More information needed",
    }[status] ?? "Not verified"
  );
}
