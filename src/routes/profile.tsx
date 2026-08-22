import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useProfileData } from "@/lib/use-profile";
import { useProfilePhoto } from "@/lib/use-profile-photo";
import { useAuth } from "@/lib/use-auth";
import {
  BadgeCheck,
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  Heart,
  History,
  LayoutDashboard,
  MapPin,
  MessageSquareText,
  Globe2,
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
      { title: "My Profile — Goall26" },
      {
        name: "description",
        content: "Manage your Goall26 profile, advertisements, inquiries, services and settings.",
      },
    ],
  }),
  component: ProfilePage,
});

const sections = [
  {
    id: "ads",
    group: "My Marketplace",
    label: "My ads",
    description: "Active, drafts, paused and closed adverts",
    icon: LayoutDashboard,
  },
  {
    id: "promotions",
    group: "Promotion",
    label: "Pro sales",
    description: "Boosts, featured listings and campaigns",
    icon: Sparkles,
  },
  {
    id: "inquiries",
    group: "My Marketplace",
    label: "Buyer inquiries",
    description: "People who contacted you about an advert",
    icon: MessageSquareText,
  },
  {
    id: "interactions",
    group: "My Marketplace",
    label: "My interactions",
    description: "Recent chats, viewed ads and saved activity",
    icon: UsersRound,
  },
  {
    id: "saved",
    group: "My Marketplace",
    label: "Saved ads",
    description: "Listings you saved to revisit later",
    icon: Heart,
  },
  {
    id: "analytics",
    group: "Performance",
    label: "Ad analytics",
    description: "Views, saves, contacts and promotion performance",
    icon: TrendingUp,
  },
  {
    id: "balance",
    group: "Payments",
    label: "Goall26 balance",
    description: "Payments for Goall26 services only",
    icon: WalletCards,
  },
  {
    id: "services",
    group: "Payments",
    label: "Premium services",
    description: "Subscription, limits and service receipts",
    icon: Sparkles,
  },
  {
    id: "reviews",
    group: "Performance",
    label: "Ratings & reviews",
    description: "Feedback from verified Goall26 interactions",
    icon: Star,
  },
  {
    id: "network",
    group: "Performance",
    label: "Followers & following",
    description: "People and businesses you connect with",
    icon: UsersRound,
  },
  {
    id: "verification",
    group: "Account",
    label: "Seller verification",
    description: "Phone, email, identity and business status",
    icon: UserCheck,
  },
  {
    id: "business",
    group: "Account",
    label: "Business profile",
    description: "Your public agricultural business information",
    icon: Building2,
  },
  {
    id: "activity",
    group: "Account",
    label: "Profile activity",
    description: "Your adverts, services and account history",
    icon: History,
  },
  {
    id: "safety",
    group: "Account",
    label: "Safety & trust",
    description: "Safety guidance, reports and blocked users",
    icon: ShieldCheck,
  },
  {
    id: "support",
    group: "Account",
    label: "Help & support",
    description: "FAQ, support tickets and Goall26 assistance",
    icon: CircleHelp,
  },
] as const;

function ProfilePage() {
  const { isLoggedIn, loading: authLoading } = useAuth();
  const { status, profile, stats, error, refresh } = useProfileData(isLoggedIn === true);
  const photoUrl = useProfilePhoto(profile?.photoKey);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Overview");

  if (authLoading) {
    return <ProfileLoading />;
  }

  if (!isLoggedIn) {
    return (
      <AppShell title="Profile">
        <section className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Sign in to Goall26</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Join Goall26 buyers and sellers. Manage your listings, chats, and marketplace profile
            securely.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              to="/login"
              className="rounded-xl bg-brand py-3 text-sm font-bold text-brand-foreground transition-transform active:scale-[0.98]"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="rounded-xl border border-border bg-card py-3 text-sm font-bold text-foreground transition-transform active:scale-[0.98]"
            >
              Create Account
            </Link>
          </div>
        </section>
      </AppShell>
    );
  }

  if (status === "loading") {
    return <ProfileLoading />;
  }

  if (status === "error") {
    return (
      <AppShell title="Profile">
        <section className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-5 text-center">
          <ShieldCheck className="mx-auto h-9 w-9 text-brand" />
          <h1 className="mt-3 text-lg font-bold">Unable to load Profile</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Make sure the Goall26 Profile service environment is configured correctly on the server.
          </p>
          <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-left text-xs text-muted-foreground">
            {profileErrorMessage(error)}
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
          <h1 className="mt-3 text-lg font-bold">Complete your Goall26 Profile</h1>
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
  const memberSince = profile.createdAt
    ? new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric" }).format(
        new Date(profile.createdAt),
      )
    : "Not available";
  const tabs = [
    "Overview",
    "Ads",
    "Services",
    "Reviews",
    "Followers",
    "Following",
    "About",
    "Activity",
  ];
  const tabRoutes: Record<string, string> = {
    Ads: "/profile-center/ads",
    Services: "/profile-center/services",
    Reviews: "/profile-center/reviews",
    Followers: "/profile-center/network",
    Following: "/profile-center/network",
    Activity: "/profile-center/activity",
  };

  const shareProfile = async () => {
    const shareData = {
      title: `${profile.fullName} on Goall26`,
      text: `View ${profile.fullName}'s Goall26 profile`,
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

        <section className="overflow-x-auto rounded-2xl border border-border bg-card p-1">
          <div className="flex min-w-max gap-1" role="tablist" aria-label="Profile sections">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                  activeTab === tab
                    ? "bg-brand text-brand-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </section>

        {activeTab !== "Overview" && (
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                {activeTab === "About" ? (
                  <Globe2 className="h-5 w-5" />
                ) : (
                  <LayoutDashboard className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold">{activeTab}</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {activeTab === "About"
                    ? `${profile.fullName} is a ${roleLabel(profile.role)} based in ${profile.location || profile.state}, Nigeria.`
                    : `Real Goall26 data for this section is available in your Profile Centre.`}
                </p>
                {activeTab === "About" && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <InfoItem icon={Globe2} label="Country" value="Nigeria" />
                    <InfoItem
                      icon={MapPin}
                      label="Location"
                      value={profile.location || profile.state}
                    />
                    <InfoItem icon={CalendarDays} label="Member since" value={memberSince} />
                    <InfoItem icon={UserRound} label="Role" value={roleLabel(profile.role)} />
                  </div>
                )}
                {tabRoutes[activeTab] && (
                  <Link
                    to={tabRoutes[activeTab] as "/profile-center/$section"}
                    params={{
                      section:
                        activeTab === "Following"
                          ? "network"
                          : (tabRoutes[activeTab].split("/").pop() ?? "ads"),
                    }}
                    className="mt-3 inline-flex rounded-xl bg-brand px-3 py-2 text-xs font-bold text-brand-foreground"
                  >
                    Open {activeTab}
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm font-bold">Profile centre</h2>
              <p className="text-[11px] text-muted-foreground">
                Manage your Goall26 activity and services
              </p>
            </div>
            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
          </div>
          {Array.from(new Set(sections.map((section) => section.group))).map((group) => (
            <div key={group}>
              <h3 className="mb-1.5 px-1 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                {group}
              </h3>
              <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
                {sections
                  .filter((section) => section.group === group)
                  .map((section) => (
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
              </div>
            </div>
          ))}
          <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
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

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Globe2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-brand" />
        {label}
      </div>
      <p className="mt-1 truncate text-xs font-semibold text-foreground">{value || "Not set"}</p>
    </div>
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

function profileErrorMessage(error: string | null) {
  const message = error?.toLowerCase() ?? "";
  if (
    message.includes("cognito") ||
    message.includes("user pool") ||
    message.includes("not configured") ||
    message.includes("profile service")
  ) {
    return "Profile service is temporarily unavailable. Please try again shortly.";
  }
  return "We could not load your Profile right now. Please try again.";
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
