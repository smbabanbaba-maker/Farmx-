import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Globe2,
  Heart,
  Languages,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Receipt,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  User,
  UserRoundCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useProfileData } from "@/lib/use-profile";
import { settingsText } from "@/lib/settings-copy";
import {
  DEFAULT_FARMX_SETTINGS,
  getMySettings,
  saveMySettings,
  type Goall26Settings,
} from "@/lib/profile.functions";
import { useAuth } from "@/lib/use-auth";
import { getMyProfilePhotoUrl } from "@/lib/profile.functions";
import { getSubscriptionSummary } from "@/lib/subscription.functions";
import type { UserSubscription } from "@/lib/subscription.types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings Center — Goall26" },
      {
        name: "description",
        content:
          "Manage your Goall26 account, privacy, marketplace preferences, payments, safety and support.",
      },
    ],
  }),
  component: SettingsPage,
});

type SettingItem = {
  slug: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

type SettingGroup = { title: string; items: SettingItem[] };

const SETTING_GROUPS: SettingGroup[] = [
  {
    title: "Account",
    items: [
      {
        slug: "personal-info",
        label: "Personal information",
        description: "Name, photo, username, phone and email",
        icon: User,
      },
      {
        slug: "business",
        label: "Business profile",
        description: "Business identity, public details and verification",
        icon: Building2,
      },
      {
        slug: "login-methods",
        label: "Login & connected accounts",
        description: "Email, phone and connected sign-in methods",
        icon: MoreHorizontal,
      },
      {
        slug: "security",
        label: "Password & security",
        description: "Password, verification and account protection",
        icon: LockKeyhole,
      },
    ],
  },
  {
    title: "Preferences",
    items: [
      {
        slug: "language",
        label: "Language & region",
        description: "Language, country, currency and date preferences",
        icon: Languages,
      },
      {
        slug: "notifications",
        label: "Notifications",
        description: "Account, marketplace, social and payment alerts",
        icon: Bell,
      },
      {
        slug: "privacy",
        label: "Privacy",
        description: "Visibility, search and activity controls",
        icon: ShieldCheck,
      },
      {
        slug: "communication",
        label: "Communication",
        description: "Messaging, calls, receipts and indicators",
        icon: MessageCircle,
      },
    ],
  },
  {
    title: "Marketplace",
    items: [
      {
        slug: "buying",
        label: "Buying preferences",
        description: "Categories, delivery and preferred locations",
        icon: ShoppingBag,
      },
      {
        slug: "selling",
        label: "Selling & posting",
        description: "Plan, posting allowance and listing controls",
        icon: BriefcaseBusiness,
      },
      {
        slug: "saved-searches",
        label: "Saved searches",
        description: "Search criteria and alert preferences",
        icon: Search,
      },
      {
        slug: "location",
        label: "Location preferences",
        description: "Marketplace location and search radius",
        icon: MapPin,
      },
    ],
  },
  {
    title: "Payments & services",
    items: [
      {
        slug: "balance",
        label: "Goall26 Balance",
        description: "Service credits and available funds",
        icon: WalletCards,
      },
      {
        slug: "payments",
        label: "Payment history",
        description: "Verified subscriptions, boosts and service payments",
        icon: Receipt,
      },
      {
        slug: "subscription",
        label: "Subscription",
        description: "Plan, expiry, usage and billing options",
        icon: CreditCard,
      },
      {
        slug: "boosting",
        label: "Boosting",
        description: "Active promotions and boost history",
        icon: Sparkles,
      },
    ],
  },
  {
    title: "Trust & safety",
    items: [
      {
        slug: "verification",
        label: "Verification",
        description: "Email, phone, identity, business and seller status",
        icon: UserRoundCheck,
      },
      {
        slug: "blocked",
        label: "Blocked users",
        description: "Review and manage blocked accounts",
        icon: Users,
      },
      {
        slug: "safety",
        label: "Reports & safety",
        description: "Report concerns and read safety guidance",
        icon: ShieldCheck,
      },
    ],
  },
  {
    title: "Activity",
    items: [
      {
        slug: "activity",
        label: "My activity",
        description: "Ads, searches, saves, follows and community activity",
        icon: Activity,
      },
      {
        slug: "recently-viewed",
        label: "Recently viewed",
        description: "Listings you opened recently",
        icon: MoreHorizontal,
      },
      {
        slug: "saved",
        label: "Saved ads",
        description: "Saved listings and current availability",
        icon: Heart,
      },
    ],
  },
  {
    title: "Support",
    items: [
      {
        slug: "support",
        label: "Help & support",
        description: "Help centre, support and problem reports",
        icon: CircleHelp,
      },
      {
        slug: "legal",
        label: "Terms & policies",
        description: "Terms, privacy, marketplace and payment rules",
        icon: ShieldCheck,
      },
      {
        slug: "about",
        label: "About Goall26",
        description: "Version, mission, contact and licences",
        icon: Globe2,
      },
    ],
  },
];

function SettingsPage() {
  const { t, lang } = useI18n();
  const { profile, stats, status: profileStatus, refresh } = useProfileData();
  const { signOut } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState<Goall26Settings>(DEFAULT_FARMX_SETTINGS);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadSubscription = useCallback(async () => {
    try {
      setSubscription(await getSubscriptionSummary());
      setSubscriptionError(null);
    } catch (error) {
      setSubscriptionError(
        error instanceof Error ? error.message : "Subscription status unavailable.",
      );
    }
  }, []);

  useEffect(() => {
    void loadSubscription();
    void getMySettings()
      .then(({ settings: saved }) => {
        if (saved) setSettings({ ...DEFAULT_FARMX_SETTINGS, ...saved });
      })
      .catch(() => {
        setMessage("Notification preferences could not be loaded yet.");
      });
  }, [loadSubscription]);

  useEffect(() => {
    let active = true;
    if (!profile?.photoKey) {
      setPhotoUrl(null);
      return () => {
        active = false;
      };
    }
    void getMyProfilePhotoUrl({ data: { objectKey: profile.photoKey } })
      .then(({ downloadUrl }) => {
        if (active) setPhotoUrl(downloadUrl);
      })
      .catch(() => {
        if (active) setPhotoUrl(null);
      });
    return () => {
      active = false;
    };
  }, [profile?.photoKey]);

  const fullName = profile?.fullName ?? "Goall26 member";
  const location = profile?.location || profile?.state || "Location not set";
  const verificationLabel =
    profile?.verification === "approved"
      ? "Verified"
      : profile?.verification === "pending"
        ? "Pending review"
        : "Not verified";
  const subscriptionLabel = subscription?.tier ?? "FREE";
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const handleLogout = () => {
    signOut();
    setMessage("You have been logged out securely.");
    window.setTimeout(() => window.location.assign("/login"), 250);
  };

  if (pathname.startsWith("/settings/")) return <Outlet />;

  return (
    <AppShell title={t("settings")}>
      <div className="space-y-5 pb-8">
        {profileStatus === "error" && (
          <Notice tone="error" action={{ label: "Retry", onClick: () => void refresh() }}>
            Your account details could not be refreshed. No changes were made.
          </Notice>
        )}
        {subscriptionError && (
          <Notice tone="error">Subscription details are temporarily unavailable.</Notice>
        )}
        {message && <Notice tone="success">{message}</Notice>}

        <section className="overflow-hidden rounded-3xl border border-brand/20 bg-gradient-to-br from-brand/10 via-card to-card p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={fullName}
                loading="lazy"
                decoding="async"
                className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-2 ring-brand/15"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-sm font-black text-brand-foreground">
                {initials || "FX"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-base font-black">{fullName}</h1>
                {profile?.verification === "approved" && (
                  <BadgeCheck className="h-4 w-4 text-brand" aria-label="Verified" />
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                @{profile?.username ?? "username"}
              </p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {location}
              </p>
            </div>
            <Link
              to="/profile"
              className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-brand/30 px-3 py-2 text-xs font-black text-brand"
            >
              View profile <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <HeaderStat label="Account type" value={profile?.role ?? "Member"} />
            <HeaderStat label="Verification" value={verificationLabel} />
            <HeaderStat label="Subscription" value={subscriptionLabel} />
            <HeaderStat label="Active ads" value={String(stats?.activeAds ?? 0)} />
          </div>
        </section>

        {SETTING_GROUPS.map((group, index) => (
          <section key={group.title}>
            <h2 className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              {settingsText(
                lang,
                `group.${["account", "preferences", "marketplace", "payments", "trust", "activity", "support"][index]}`,
                group.title,
              )}
            </h2>
            <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
              {group.items.map((item) => (
                <SettingsRow key={item.slug} item={item} lang={lang} />
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-brand" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Quick notification control</p>
              <p className="text-[11px] text-muted-foreground">
                Turn all non-critical in-app notifications on or off.
              </p>
            </div>
            <button
              type="button"
              disabled={settingsBusy}
              onClick={async () => {
                const enabled = !Object.values(settings.notifications).every(Boolean);
                const next = {
                  ...settings,
                  notifications: Object.fromEntries(
                    Object.keys(settings.notifications).map((key) => [key, enabled]),
                  ),
                } as Goall26Settings;
                setSettings(next);
                setSettingsBusy(true);
                try {
                  await saveMySettings({ data: next });
                  setMessage(enabled ? "Notifications enabled." : "Notifications paused.");
                } catch {
                  setSettings(settings);
                  setMessage("Notification preferences could not be saved. Please try again.");
                } finally {
                  setSettingsBusy(false);
                }
              }}
              aria-pressed={Object.values(settings.notifications).every(Boolean)}
              className={`relative h-6 w-11 rounded-full transition ${Object.values(settings.notifications).every(Boolean) ? "bg-brand" : "bg-muted-foreground/30"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${Object.values(settings.notifications).every(Boolean) ? "left-5.5" : "left-0.5"}`}
              />
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-brand/20 bg-brand/[0.03] p-4">
          <div className="flex items-start gap-3">
            <Settings2 className="mt-0.5 h-4 w-4 text-brand" />
            <div>
              <h2 className="text-sm font-black">Account actions</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Goall26 keeps private account data behind your authenticated session. Changes made
                in a child page are saved to the relevant service and reflected here when you
                return.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2.5 text-xs font-black text-brand-foreground"
            >
              <LogOut className="h-4 w-4" /> {t("logout")}
            </button>
            <Link
              to="/settings/$section"
              params={{ section: "security" }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-black"
            >
              <Trash2 className="h-4 w-4 text-brand" /> Delete account
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function SettingsRow({ item, lang }: { item: SettingItem; lang: import("@/lib/i18n").Lang }) {
  const Icon = item.icon;
  const label = settingsText(lang, `item.${item.slug}.label`, item.label);
  const description = settingsText(lang, `item.${item.slug}.description`, item.description);
  return (
    <Link
      to="/settings/$section"
      params={{ section: item.slug }}
      className="group flex items-center gap-3 px-3 py-3.5 text-left transition hover:bg-accent/70"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{label}</span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          {description}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-brand" />
    </Link>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/70 p-2.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-xs font-black capitalize">{value}</p>
    </div>
  );
}

function Notice({
  children,
  tone,
  action,
}: {
  children: ReactNode;
  tone: "error" | "success";
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${tone === "error" ? "border-amber-300 bg-amber-50 text-amber-950" : "border-emerald-300 bg-emerald-50 text-emerald-950"}`}
      role="status"
    >
      <span className="min-w-0 flex-1">{children}</span>
      {action && (
        <button type="button" onClick={action.onClick} className="underline">
          {action.label}
        </button>
      )}
    </div>
  );
}
