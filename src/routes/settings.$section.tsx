import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  CreditCard,
  ExternalLink,
  FileText,
  Globe2,
  Heart,
  ImagePlus,
  Languages,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageCircle,
  Receipt,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  User,
  UserRoundCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LANGUAGES, useI18n, type Lang } from "@/lib/i18n";
import { NIGERIA_STATES_LGAS } from "@/lib/nigeria-locations";
import {
  DEFAULT_FARMX_SETTINGS,
  createBusinessMediaUpload,
  deleteMyAccountData,
  getMyBusinessMediaUrl,
  getMyBusinessProfile,
  getMySettings,
  removeMyBusinessMedia,
  saveMyBusinessProfile,
  saveMySettings,
  type FarmXBusinessProfile,
  type FarmXSettings,
} from "@/lib/profile.functions";
import { useProfileData } from "@/lib/use-profile";
import { settingsText } from "@/lib/settings-copy";
import { useAuth } from "@/lib/use-auth";
import { changePassword, deleteCognitoAccount } from "@/lib/auth";
import {
  createProfilePhotoUpload,
  getMyProfilePhotoUrl,
  removeMyProfilePhoto,
  saveMyLanguagePreference,
  saveMyProfile,
  type FarmXProfile,
} from "@/lib/profile.functions";
import { getMyAds, updateMyAdStatus } from "@/lib/profile.functions";
import {
  cancelSubscription,
  getSubscriptionSummary,
  setSubscriptionAutoRenew,
} from "@/lib/subscription.functions";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-repository";
import type { UserSubscription } from "@/lib/subscription.types";
import { getMarketRepository } from "@/lib/market-repository";
import type { MarketListing } from "@/lib/market-types";
import { getTransactions, getWalletSummary, type WalletSummary } from "@/lib/wallet.functions";

export const Route = createFileRoute("/settings/$section")({
  component: SettingsSectionPage,
});

type ProfileForm = Pick<
  FarmXProfile,
  | "fullName"
  | "username"
  | "role"
  | "bio"
  | "state"
  | "location"
  | "phone"
  | "email"
  | "agriculturalInterests"
  | "skills"
  | "privacy"
  | "preferredLanguage"
  | "photoKey"
>;

type Ad = Awaited<ReturnType<typeof getMyAds>>[number];
type Transaction = {
  id: string;
  reference: string;
  serviceType: string;
  serviceLabel: string;
  listingTitle?: string;
  amount: number;
  paymentMethod: string;
  status: "successful" | "pending" | "failed" | "refunded";
  createdAt: string;
  activatedUntil?: string;
};

function mergeSettings(saved: Partial<FarmXSettings>): FarmXSettings {
  return {
    ...DEFAULT_FARMX_SETTINGS,
    ...saved,
    notifications: { ...DEFAULT_FARMX_SETTINGS.notifications, ...saved.notifications },
    communication: { ...DEFAULT_FARMX_SETTINGS.communication, ...saved.communication },
    buying: { ...DEFAULT_FARMX_SETTINGS.buying, ...saved.buying },
    blockedUsers: saved.blockedUsers ?? DEFAULT_FARMX_SETTINGS.blockedUsers,
  };
}

const TITLES: Record<string, { title: string; description: string }> = {
  "personal-info": {
    title: "Personal information",
    description: "Keep your Goall26 identity and contact details accurate.",
  },
  business: {
    title: "Business profile",
    description: "Manage the public business information connected to your Goall26 account.",
  },
  "login-methods": {
    title: "Login & connected accounts",
    description: "Review how your account is protected. Goall26 never displays passwords.",
  },
  security: {
    title: "Password & security",
    description: "Review verification and account-protection options.",
  },
  language: {
    title: "Language & region",
    description: "Choose the language and regional preferences used across Goall26.",
  },
  notifications: {
    title: "Notifications",
    description: "Control the categories of non-critical alerts you receive.",
  },
  privacy: {
    title: "Privacy",
    description: "Choose what other Goall26 users can see and who can contact you.",
  },
  communication: {
    title: "Communication",
    description: "Manage messages, calls, receipts and activity indicators.",
  },
  buying: {
    title: "Buying preferences",
    description: "Set the categories and locations that make Market more useful.",
  },
  selling: {
    title: "Selling & posting",
    description: "Review real posting usage, listing status and your current plan.",
  },
  "saved-searches": {
    title: "Saved searches",
    description: "Review saved search history and alert controls.",
  },
  location: {
    title: "Location preferences",
    description: "Choose the location used for marketplace results.",
  },
  balance: {
    title: "Goall26 Balance",
    description:
      "View service funds and promotional credits. Withdrawals are shown only when supported.",
  },
  payments: {
    title: "Payment history",
    description: "Review payment records returned by the Goall26 server.",
  },
  subscription: {
    title: "Subscription",
    description: "Review your current plan, usage and renewal state.",
  },
  boosting: {
    title: "Boosting",
    description: "Review active listing promotion eligibility and manage boosts.",
  },
  verification: {
    title: "Verification",
    description: "Review the verification steps available for your account.",
  },
  blocked: {
    title: "Blocked users",
    description: "Manage blocked users stored in your Goall26 account.",
  },
  safety: {
    title: "Reports & safety",
    description: "Use Goall26 safety guidance and report supported marketplace concerns.",
  },
  activity: {
    title: "My activity",
    description: "Review activity surfaces that are available from your account.",
  },
  "recently-viewed": {
    title: "Recently viewed",
    description: "Listings you opened recently from the real Market repository.",
  },
  saved: { title: "Saved ads", description: "Listings saved through your Goall26 account." },
  support: {
    title: "Help & support",
    description: "Find help, contact Goall26, and track your support requests.",
  },
  legal: {
    title: "Terms & policies",
    description: "Read the policies that govern Goall26 accounts and marketplace activity.",
  },
  about: {
    title: "About Goall26",
    description: "Product information, version and official links.",
  },
};

function SettingsSectionPage() {
  const { section } = Route.useParams();
  const content = TITLES[section] ?? TITLES["personal-info"];
  const { lang } = useI18n();
  const localizedTitle = settingsText(lang, `item.${section}.label`, content.title);
  const localizedDescription = settingsText(
    lang,
    `item.${section}.description`,
    content.description,
  );
  const { profile, stats, status, refresh } = useProfileData();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const showNotice = (tone: "success" | "error", text: string) => {
    setNotice({ tone, text });
    window.setTimeout(() => setNotice(null), 3600);
  };

  if (status === "loading")
    return (
      <SectionFrame title={localizedTitle} description={localizedDescription}>
        <Skeleton />
      </SectionFrame>
    );
  if (status === "error" || !profile)
    return (
      <SectionFrame title={localizedTitle} description={localizedDescription}>
        <ErrorState
          message="Your authenticated profile could not be loaded."
          retry={() => void refresh()}
        />
      </SectionFrame>
    );

  const body =
    section === "personal-info" ? (
      <PersonalInfo
        profile={profile}
        onSaved={() => {
          void refresh();
          showNotice("success", "Personal information saved.");
        }}
        onError={(message) => showNotice("error", message)}
      />
    ) : section === "business" ? (
      <BusinessPage profile={profile} />
    ) : section === "login-methods" ? (
      <LoginMethods profile={profile} />
    ) : section === "security" ? (
      <SecurityPage profile={profile} onNotice={showNotice} />
    ) : section === "language" ? (
      <LanguagePage
        profile={profile}
        onSaved={() => {
          void refresh();
          showNotice("success", "Language preference saved.");
        }}
        onError={(message) => showNotice("error", message)}
      />
    ) : section === "notifications" ? (
      <NotificationsPage />
    ) : section === "privacy" ? (
      <PrivacyPage
        profile={profile}
        onSaved={() => {
          void refresh();
          showNotice("success", "Privacy settings saved.");
        }}
        onError={(message) => showNotice("error", message)}
      />
    ) : section === "communication" ? (
      <CommunicationPage />
    ) : section === "buying" ? (
      <BuyingPage />
    ) : section === "selling" ? (
      <SellingPage profile={profile} stats={stats} onNotice={showNotice} />
    ) : section === "saved-searches" ? (
      <SavedSearchesPage />
    ) : section === "location" ? (
      <LocationPage
        profile={profile}
        onSaved={() => {
          void refresh();
          showNotice("success", "Location preferences saved.");
        }}
        onError={(message) => showNotice("error", message)}
      />
    ) : section === "balance" ? (
      <BalancePage />
    ) : section === "payments" ? (
      <PaymentsPage />
    ) : section === "subscription" ? (
      <SubscriptionPage onNotice={showNotice} />
    ) : section === "boosting" ? (
      <BoostingPage />
    ) : section === "verification" ? (
      <VerificationPage profile={profile} />
    ) : section === "blocked" ? (
      <BlockedPage />
    ) : section === "safety" ? (
      <SafetyPage />
    ) : section === "activity" ? (
      <ActivityPage />
    ) : section === "recently-viewed" ? (
      <MarketActivityPage mode="recent" />
    ) : section === "saved" ? (
      <MarketActivityPage mode="saved" />
    ) : section === "support" ? (
      <SupportPage />
    ) : section === "legal" ? (
      <LegalPage />
    ) : section === "about" ? (
      <AboutPage />
    ) : (
      <PersonalInfo
        profile={profile}
        onSaved={() => {
          void refresh();
          showNotice("success", "Personal information saved.");
        }}
        onError={(message) => showNotice("error", message)}
      />
    );

  return (
    <SectionFrame
      title={localizedTitle}
      description={localizedDescription}
      notice={notice}
      onLogout={() => {
        signOut();
        navigate({ to: "/login" });
      }}
    >
      {body}
    </SectionFrame>
  );
}

function SectionFrame({
  title,
  description,
  children,
  notice,
  onLogout,
}: {
  title: string;
  description: string;
  children: ReactNode;
  notice?: { tone: "success" | "error"; text: string } | null;
  onLogout?: () => void;
}) {
  return (
    <AppShell title={title}>
      <div className="space-y-4 pb-8">
        <Link
          to="/settings"
          className="inline-flex items-center gap-1 text-xs font-black text-muted-foreground hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Settings
        </Link>
        <section className="rounded-3xl border border-brand/15 bg-gradient-to-br from-brand/10 via-card to-card p-5">
          <h1 className="text-xl font-black tracking-tight">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </section>
        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
        {children}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 text-xs font-bold text-brand"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        )}
      </div>
    </AppShell>
  );
}

function PersonalInfo({
  profile,
  onSaved,
  onError,
}: {
  profile: FarmXProfile;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState<ProfileForm>(() => ({
    fullName: profile.fullName,
    username: profile.username,
    role: profile.role,
    bio: profile.bio,
    state: profile.state,
    location: profile.location,
    phone: profile.phone,
    email: profile.email,
    agriculturalInterests: profile.agriculturalInterests,
    skills: profile.skills,
    privacy: profile.privacy,
    preferredLanguage: profile.preferredLanguage,
    photoKey: profile.photoKey,
  }));
  const [saving, setSaving] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  useEffect(() => {
    let active = true;
    if (!profile.photoKey) {
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
  }, [profile.photoKey]);
  const update = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setSaving(true);
    try {
      await saveMyProfile({ data: form });
      onSaved();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Profile could not be saved.");
    } finally {
      setSaving(false);
    }
  };
  const upload = async (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      onError("Use a JPG, PNG or WebP profile photo.");
      return;
    }
    setPhotoBusy(true);
    try {
      const { objectKey, uploadUrl } = await createProfilePhotoUpload({
        data: { contentType: file.type as "image/jpeg" | "image/png" | "image/webp" },
      });
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("The profile photo upload failed.");
      const next = { ...form, photoKey: objectKey };
      await saveMyProfile({ data: next });
      update("photoKey", objectKey);
      setPhotoUrl(URL.createObjectURL(file));
      onSaved();
    } catch (error) {
      onError(error instanceof Error ? error.message : "The profile photo could not be saved.");
    } finally {
      setPhotoBusy(false);
    }
  };
  const removePhoto = async () => {
    setPhotoBusy(true);
    try {
      await removeMyProfilePhoto();
      update("photoKey", undefined);
      setPhotoUrl(null);
      onSaved();
    } catch (error) {
      onError(error instanceof Error ? error.message : "The profile photo could not be removed.");
    } finally {
      setPhotoBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <Card title="Profile photo" icon={User}>
        <div className="flex items-center gap-3">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={form.fullName}
              className="h-16 w-16 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-lg font-black text-brand-foreground">
              {form.fullName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand px-3 py-2 text-xs font-black text-brand-foreground">
              <ImagePlus className="h-4 w-4" /> {photoBusy ? "Uploading…" : "Change photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={photoBusy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            {form.photoKey && (
              <button
                type="button"
                onClick={() => void removePhoto()}
                disabled={photoBusy}
                className="rounded-xl border border-border px-3 py-2 text-xs font-bold"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </Card>
      <Card title="Identity and contact" icon={UserRoundCheck}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Full name"
            value={form.fullName}
            onChange={(value) => update("fullName", value)}
          />
          <Field
            label="Username"
            value={form.username}
            onChange={(value) =>
              update(
                "username",
                value
                  .toLowerCase()
                  .replace(/[^a-z0-9_]/g, "")
                  .slice(0, 24),
              )
            }
            hint="3–24 lowercase letters, numbers or underscores."
          />
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(value) => update("email", value)}
          />
          <Field
            label="Phone number"
            value={form.phone}
            onChange={(value) => update("phone", value)}
          />
          <SelectField
            label="Account type"
            value={form.role}
            options={["farmer", "seller", "buyer", "employer", "agricultural_business"]}
            onChange={(value) => update("role", value as ProfileForm["role"])}
          />
          <SelectField
            label="State"
            value={form.state}
            options={Object.keys(NIGERIA_STATES_LGAS)}
            onChange={(value) => update("state", value)}
          />
          <Field
            label="LGA / City"
            value={form.location}
            onChange={(value) => update("location", value)}
          />
          <Field
            label="About me"
            value={form.bio}
            onChange={(value) => update("bio", value)}
            multiline
          />
        </div>
      </Card>
      <Card title="Interests and skills" icon={Sparkles}>
        <Field
          label="Agricultural interests"
          value={form.agriculturalInterests.join(", ")}
          hint="Separate items with commas."
          onChange={(value) =>
            update(
              "agriculturalInterests",
              value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
                .slice(0, 10),
            )
          }
        />
        <div className="mt-3">
          <Field
            label="Skills"
            value={form.skills.join(", ")}
            hint="Separate items with commas."
            onChange={(value) =>
              update(
                "skills",
                value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .slice(0, 10),
              )
            }
          />
        </div>
      </Card>
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-xs font-black text-brand-foreground disabled:opacity-60"
      >
        <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save personal information"}
      </button>
    </div>
  );
}

const EMPTY_BUSINESS: FarmXBusinessProfile = {
  name: "",
  description: "",
  category: "",
  businessType: "",
  phone: "",
  email: "",
  address: "",
  state: "",
  lga: "",
  website: "",
  socialLinks: [],
  yearsInBusiness: 0,
  services: [],
};

function BusinessPage({ profile }: { profile: FarmXProfile }) {
  const [form, setForm] = useState<FarmXBusinessProfile>(EMPTY_BUSINESS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mediaBusy, setMediaBusy] = useState<"logo" | "cover" | null>(null);
  const [mediaUrls, setMediaUrls] = useState<{ logo: string | null; cover: string | null }>({
    logo: null,
    cover: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    void getMyBusinessProfile()
      .then(({ business }) => {
        if (!active) return;
        setForm({ ...EMPTY_BUSINESS, ...(business ?? {}) });
        if (business?.logoKey) {
          void getMyBusinessMediaUrl({ data: { objectKey: business.logoKey } }).then(
            ({ downloadUrl }) => {
              if (active) setMediaUrls((current) => ({ ...current, logo: downloadUrl }));
            },
          );
        }
        if (business?.coverKey) {
          void getMyBusinessMediaUrl({ data: { objectKey: business.coverKey } }).then(
            ({ downloadUrl }) => {
              if (active) setMediaUrls((current) => ({ ...current, cover: downloadUrl }));
            },
          );
        }
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error ? reason.message : "Business profile could not be loaded.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const update = <K extends keyof FarmXBusinessProfile>(key: K, value: FarmXBusinessProfile[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };
  const uploadMedia = async (kind: "logo" | "cover", file: File) => {
    if (!(["image/jpeg", "image/png", "image/webp"] as string[]).includes(file.type)) {
      setError("Use a JPG, PNG or WebP business image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Business images must be 5MB or smaller.");
      return;
    }
    setMediaBusy(kind);
    setError(null);
    try {
      const { objectKey, uploadUrl } = await createBusinessMediaUpload({
        data: { kind, contentType: file.type as "image/jpeg" | "image/png" | "image/webp" },
      });
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("The business image upload failed.");
      update(kind === "logo" ? "logoKey" : "coverKey", objectKey);
      setMediaUrls((current) => ({ ...current, [kind]: URL.createObjectURL(file) }));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "The business image could not be uploaded.",
      );
    } finally {
      setMediaBusy(null);
    }
  };
  const save = async () => {
    if (!form.name.trim()) {
      setError("Enter a business name before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveMyBusinessProfile({ data: form });
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Business profile could not be saved.");
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <Skeleton />;
  return (
    <div className="space-y-4">
      {error && <Notice tone="error">{error}</Notice>}
      {saved && <Notice tone="success">Business profile saved securely.</Notice>}
      <Card title="Business identity" icon={BuildingIcon}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Business name"
            value={form.name}
            onChange={(value) => update("name", value)}
          />
          <Field
            label="Category"
            value={form.category}
            onChange={(value) => update("category", value)}
          />
          <Field
            label="Business type"
            value={form.businessType}
            onChange={(value) => update("businessType", value)}
          />
          <Field
            label="Years in business"
            type="number"
            value={String(form.yearsInBusiness)}
            onChange={(value) => update("yearsInBusiness", Math.max(0, Number(value) || 0))}
          />
          <Field
            label="Business phone"
            value={form.phone}
            onChange={(value) => update("phone", value)}
          />
          <Field
            label="Business email"
            type="email"
            value={form.email}
            onChange={(value) => update("email", value)}
          />
          <Field
            label="Website"
            type="url"
            value={form.website}
            onChange={(value) => update("website", value)}
          />
          <Field
            label="Address"
            value={form.address}
            onChange={(value) => update("address", value)}
          />
          <SelectField
            label="State"
            value={form.state}
            options={Object.keys(NIGERIA_STATES_LGAS)}
            onChange={(value) => update("state", value)}
          />
          <Field label="LGA" value={form.lga} onChange={(value) => update("lga", value)} />
          <Field
            label="Description"
            value={form.description}
            onChange={(value) => update("description", value)}
            multiline
          />
          <Field
            label="Services (comma separated)"
            value={form.services.join(", ")}
            onChange={(value) =>
              update(
                "services",
                value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .slice(0, 30),
              )
            }
          />
        </div>
      </Card>
      <Card title="Business images" icon={ImagePlus}>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["logo", "cover"] as const).map((kind) => (
            <div key={kind} className="rounded-2xl border border-border p-3">
              <p className="text-xs font-black capitalize">Business {kind}</p>
              <div
                className={`mt-2 overflow-hidden rounded-xl bg-muted ${kind === "cover" ? "aspect-[2/1]" : "aspect-square max-w-40"}`}
              >
                {mediaUrls[kind] ? (
                  <img
                    src={mediaUrls[kind] ?? ""}
                    alt={`Business ${kind}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    No image
                  </div>
                )}
              </div>
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand px-3 py-2 text-xs font-black text-brand-foreground">
                <ImagePlus className="h-4 w-4" />{" "}
                {mediaBusy === kind ? "Uploading…" : `Upload ${kind}`}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={mediaBusy !== null}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadMedia(kind, file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              {form[kind === "logo" ? "logoKey" : "coverKey"] && (
                <button
                  type="button"
                  className="ml-2 rounded-xl border border-border px-3 py-2 text-xs font-bold"
                  onClick={async () => {
                    try {
                      await removeMyBusinessMedia({ data: { kind } });
                      update(kind === "logo" ? "logoKey" : "coverKey", undefined);
                      setMediaUrls((current) => ({ ...current, [kind]: null }));
                    } catch (reason) {
                      setError(
                        reason instanceof Error
                          ? reason.message
                          : "The image could not be removed.",
                      );
                    }
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving || mediaBusy !== null}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-xs font-black text-brand-foreground disabled:opacity-60"
      >
        <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save business profile"}
      </button>
      <p className="text-[11px] leading-5 text-muted-foreground">
        Business verification is reviewed server-side. Saving information does not create a false
        verified badge.
      </p>
    </div>
  );
}
function BuildingIcon({ className }: { className?: string }) {
  return (
    <span className={className}>
      <ShoppingBag className="h-4 w-4" />
    </span>
  );
}
function LoginMethods({ profile }: { profile: FarmXProfile }) {
  return (
    <div className="space-y-4">
      <Card title="Current login methods" icon={LockKeyhole}>
        <InfoRow label="Email and password" value="Connected" />
        <InfoRow label="Account email" value={profile.email} />
        <InfoRow label="Email verification" value="Managed by AWS Cognito" />
        <InfoRow
          label="Google / Facebook"
          value="Available only when configured in Cognito Hosted UI"
        />
      </Card>
      <Card title="Security notice" icon={ShieldCheck}>
        <p className="text-sm leading-6 text-muted-foreground">
          Goall26 does not display or store your password in the browser. Connected-account changes
          require the Cognito Hosted UI configuration and an authenticated session.
        </p>
      </Card>
    </div>
  );
}
function SecurityPage({
  profile,
  onNotice,
}: {
  profile: FarmXProfile;
  onNotice: (tone: "success" | "error", text: string) => void;
}) {
  const { signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const updatePassword = async () => {
    if (!/^\d{6}$/.test(currentPassword) || !/^\d{6}$/.test(newPassword)) {
      onNotice("error", "Use exactly 6 digits for your current and new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      onNotice("error", "The new passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onNotice("success", "Your password was changed securely through AWS Cognito.");
    } catch (reason) {
      onNotice(
        "error",
        reason instanceof Error ? reason.message : "Password could not be changed.",
      );
    } finally {
      setBusy(false);
    }
  };
  const deleteAccount = async () => {
    if (window.prompt("Type DELETE to permanently remove your Goall26 account") !== "DELETE")
      return;
    setDeleting(true);
    try {
      await deleteMyAccountData();
      await deleteCognitoAccount();
      signOut();
      window.location.assign("/login");
    } catch (reason) {
      setDeleting(false);
      onNotice(
        "error",
        reason instanceof Error ? reason.message : "Account deletion could not be completed.",
      );
    }
  };
  return (
    <div className="space-y-4">
      <Card title="Verification status" icon={ShieldCheck}>
        <InfoRow label="Email" value={profile.email ? "Account email available" : "Not set"} />
        <InfoRow label="Phone" value={profile.phone ? "Number saved" : "Action required"} />
        <InfoRow label="Identity / seller" value={profile.verification.replaceAll("_", " ")} />
      </Card>
      <Card title="Change password" icon={LockKeyhole}>
        <p className="mb-3 text-sm leading-6 text-muted-foreground">
          Goall26 passwords use exactly 6 digits. Password changes are sent directly to AWS Cognito.
        </p>
        <div className="space-y-3">
          <Field
            label="Current 6-digit password"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={currentPassword}
            onChange={setCurrentPassword}
          />
          <Field
            label="New 6-digit password"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={newPassword}
            onChange={setNewPassword}
          />
          <Field
            label="Confirm new password"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void updatePassword()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-2.5 text-xs font-black text-brand-foreground disabled:opacity-60"
        >
          <LockKeyhole className="h-4 w-4" /> {busy ? "Changing…" : "Change password"}
        </button>
        <Link
          to="/login"
          className="ml-2 inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-black"
        >
          Forgot password <ChevronRight className="h-4 w-4" />
        </Link>
      </Card>
      <Card title="Session" icon={LogOut}>
        <p className="text-sm leading-6 text-muted-foreground">
          Sign out clears the Cognito session and local authenticated state.
        </p>
        <button
          type="button"
          onClick={() => {
            signOut();
            window.location.assign("/login");
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-black"
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </Card>
      <Card title="Danger zone" icon={Trash2}>
        <p className="text-sm leading-6 text-muted-foreground">
          Deletion permanently removes your Goall26 profile and owned listings from the configured
          data store, then deletes the Cognito account. This cannot be undone.
        </p>
        <button
          type="button"
          disabled={deleting}
          onClick={() => void deleteAccount()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-3 py-2.5 text-xs font-black text-red-600 disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" /> {deleting ? "Deleting…" : "Delete account"}
        </button>
      </Card>
    </div>
  );
}
function LanguagePage({
  profile,
  onSaved,
  onError,
}: {
  profile: FarmXProfile;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const { lang, setLang } = useI18n();
  const [value, setValue] = useState<Lang>(lang);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      setLang(value);
      await saveMyLanguagePreference({ data: { preferredLanguage: value } });
      onSaved();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Language could not be saved.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-4">
      <Card title="Language" icon={Languages}>
        <div className="grid gap-2 sm:grid-cols-2">
          {LANGUAGES.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => setValue(item.code)}
              className={`rounded-xl border px-3 py-3 text-left text-sm font-bold ${value === item.code ? "border-brand bg-brand/10 text-brand" : "border-border"}`}
            >
              <span className="block">{item.label}</span>
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                {item.locale}
              </span>
            </button>
          ))}
        </div>
      </Card>
      <Card title="Region" icon={Globe2}>
        <InfoRow label="Country" value="Nigeria" />
        <InfoRow label="Currency" value="NGN ₦" />
        <InfoRow label="Date and time" value="Use device region" />
      </Card>
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-xs font-black text-brand-foreground"
      >
        {saving ? "Saving…" : "Save language and region"}
      </button>
    </div>
  );
}
function PrivacyPage({
  profile,
  onSaved,
  onError,
}: {
  profile: FarmXProfile;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState(profile.privacy);
  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    try {
      await saveMyProfile({
        data: {
          fullName: profile.fullName,
          username: profile.username,
          role: profile.role,
          bio: profile.bio,
          state: profile.state,
          location: profile.location,
          phone: profile.phone,
          email: profile.email,
          agriculturalInterests: profile.agriculturalInterests,
          skills: profile.skills,
          preferredLanguage: profile.preferredLanguage,
          photoKey: profile.photoKey,
          privacy: form,
        },
      });
      onSaved();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Privacy settings could not be saved.");
    }
  };
  return (
    <div className="space-y-4">
      <Card title="Profile visibility" icon={ShieldCheck}>
        <SelectField
          label="Who can see your profile?"
          value={form.profileVisibility}
          options={["public", "farmx_members", "private"]}
          onChange={(value) => update("profileVisibility", value as typeof form.profileVisibility)}
        />
        <SelectField
          label="Who can message you?"
          value={form.messagePermission}
          options={["everyone", "farmx_members", "followers"]}
          onChange={(value) => update("messagePermission", value as typeof form.messagePermission)}
        />
        <SelectField
          label="Who can call you?"
          value={form.callPermission}
          options={["everyone", "farmx_members", "nobody"]}
          onChange={(value) => update("callPermission", value as typeof form.callPermission)}
        />
      </Card>
      <Card title="Activity and business" icon={User}>
        <Toggle
          label="Show followers"
          value={form.showFollowers}
          onChange={(value) => update("showFollowers", value)}
        />
        <Toggle
          label="Show activity"
          value={form.showActivity}
          onChange={(value) => update("showActivity", value)}
        />
        <Toggle
          label="Show business information"
          value={form.showBusinessInfo}
          onChange={(value) => update("showBusinessInfo", value)}
        />
      </Card>
      <button
        type="button"
        onClick={() => void save()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-xs font-black text-brand-foreground"
      >
        <Save className="h-4 w-4" /> Save privacy settings
      </button>
    </div>
  );
}
function NotificationsPage() {
  return (
    <PreferencePage
      kind="notifications"
      title="Notification channels"
      items={[
        ["Security alerts", "securityAlerts"],
        ["Login alerts", "loginAlerts"],
        ["Verification updates", "verificationUpdates"],
        ["New buyer inquiries", "buyerInquiries"],
        ["Listing activity", "listingActivity"],
        ["Saved-search alerts", "savedSearchAlerts"],
        ["Followers and community activity", "socialActivity"],
        ["New messages", "newMessages"],
        ["Payment success and failure", "paymentUpdates"],
        ["Subscription renewal and expiry", "subscriptionUpdates"],
        ["Boost updates", "boostUpdates"],
        ["Matching jobs", "jobAlerts"],
      ]}
    />
  );
}
function CommunicationPage() {
  return (
    <PreferencePage
      kind="communication"
      title="Communication controls"
      items={[
        ["Allow messages", "allowMessages"],
        ["Allow in-app calls", "allowCalls"],
        ["Read receipts", "readReceipts"],
        ["Typing indicator", "typingIndicators"],
        ["Message notifications", "messageNotifications"],
        ["Buyer communication", "buyerCommunication"],
        ["Seller communication", "sellerCommunication"],
      ]}
    />
  );
}
function PreferencePage({
  kind,
  title,
  items,
}: {
  kind: "notifications" | "communication";
  title: string;
  items: [string, string][];
}) {
  const [settings, setSettings] = useState<FarmXSettings>(DEFAULT_FARMX_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void getMySettings()
      .then(({ settings: saved }) => {
        if (!active) return;
        setSettings(saved ? mergeSettings(saved) : DEFAULT_FARMX_SETTINGS);
      })
      .catch((reason) => {
        if (active)
          setError(reason instanceof Error ? reason.message : "Preferences could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const update = async (key: string, value: boolean) => {
    const previous = settings;
    const next = {
      ...settings,
      [kind]: { ...settings[kind], [key]: value },
    } as FarmXSettings;
    setSettings(next);
    setSavingKey(key);
    setError(null);
    try {
      await saveMySettings({ data: next });
    } catch (reason) {
      setSettings(previous);
      setError(
        reason instanceof Error
          ? reason.message
          : "Preference could not be saved. Please try again.",
      );
    } finally {
      setSavingKey(null);
    }
  };
  return (
    <Card title={title} icon={Bell}>
      {loading ? (
        <Skeleton />
      ) : (
        <>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="space-y-1">
            {items.map(([label, key]) => {
              const value = Boolean((settings[kind] as Record<string, boolean>)[key]);
              return (
                <Toggle
                  key={key}
                  label={label}
                  value={value}
                  disabled={
                    savingKey === key || (kind === "notifications" && key === "securityAlerts")
                  }
                  onChange={(next) => void update(key, next)}
                />
              );
            })}
          </div>
          <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
            Preferences are saved to your authenticated Goall26 profile. Critical security alerts
            remain enabled.
          </p>
        </>
      )}
    </Card>
  );
}
function BuyingPage() {
  return (
    <div className="space-y-4">
      <Card title="Buying interests" icon={ShoppingBag}>
        <p className="text-sm leading-6 text-muted-foreground">
          Choose categories and price alerts from Market search. Goall26 will only show saved-search
          alerts after you create a real search in the marketplace.
        </p>
        <Link
          to="/market"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-2.5 text-xs font-black text-brand-foreground"
        >
          Open Market <ChevronRight className="h-4 w-4" />
        </Link>
      </Card>
      <Card title="Delivery preference" icon={MapPin}>
        <InfoRow label="Available controls" value="Configured per listing and seller" />
        <InfoRow label="Preferred location" value="Set in Location preferences" />
      </Card>
    </div>
  );
}
function LocationPage({
  profile,
  onSaved,
  onError,
}: {
  profile: FarmXProfile;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [state, setState] = useState(profile.state);
  const [location, setLocation] = useState(profile.location);
  const save = async () => {
    try {
      await saveMyProfile({
        data: {
          fullName: profile.fullName,
          username: profile.username,
          role: profile.role,
          bio: profile.bio,
          state,
          location,
          phone: profile.phone,
          email: profile.email,
          agriculturalInterests: profile.agriculturalInterests,
          skills: profile.skills,
          preferredLanguage: profile.preferredLanguage,
          photoKey: profile.photoKey,
          privacy: profile.privacy,
        },
      });
      onSaved();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Location could not be saved.");
    }
  };
  return (
    <div className="space-y-4">
      <Card title="Marketplace location" icon={MapPin}>
        <SelectField
          label="State"
          value={state}
          options={Object.keys(NIGERIA_STATES_LGAS)}
          onChange={setState}
        />
        <Field label="LGA / City" value={location} onChange={setLocation} />
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
          Goall26 does not request device location automatically. Choose a location manually or
          allow your browser to provide one when a future location feature is enabled.
        </p>
      </Card>
      <button
        type="button"
        onClick={() => void save()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-xs font-black text-brand-foreground"
      >
        <Save className="h-4 w-4" /> Save location
      </button>
    </div>
  );
}
function SellingPage({
  profile,
  stats,
  onNotice,
}: {
  profile: FarmXProfile;
  stats: { activeAds: number; totalAds: number } | null;
  onNotice: (tone: "success" | "error", text: string) => void;
}) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const load = useCallback(async () => {
    try {
      const [nextAds, nextSubscription] = await Promise.all([getMyAds(), getSubscriptionSummary()]);
      setAds(nextAds);
      setSubscription(nextSubscription);
    } catch (error) {
      onNotice(
        "error",
        error instanceof Error ? error.message : "Selling data could not be loaded.",
      );
    }
  }, [onNotice]);
  useEffect(() => {
    void load();
  }, [load]);
  const counts = useMemo(
    () =>
      ads.reduce<Record<string, number>>((acc, ad) => {
        acc[ad.status] = (acc[ad.status] ?? 0) + 1;
        return acc;
      }, {}),
    [ads],
  );
  const changeStatus = async (
    ad: Ad,
    status: "ACTIVE" | "PAUSED" | "SOLD" | "UNAVAILABLE" | "CLOSED",
  ) => {
    try {
      await updateMyAdStatus({ data: { listingId: ad.listingId, status } });
      await load();
      onNotice("success", "Listing status updated.");
    } catch (error) {
      onNotice(
        "error",
        error instanceof Error ? error.message : "Listing status could not be updated.",
      );
    }
  };
  return (
    <div className="space-y-4">
      <Card title="Current plan and allowance" icon={CreditCard}>
        <InfoRow label="Plan" value={subscription?.tier ?? "FREE"} />
        <InfoRow label="Status" value={subscription?.status ?? "Unknown"} />
        <InfoRow
          label="Expiry"
          value={subscription?.renewalDate ? formatDate(subscription.renewalDate) : "Not active"}
        />
        <InfoRow
          label="Posting allowance"
          value={
            subscription?.listingLimit
              ? `${subscription.activeListings ?? stats?.activeAds ?? 0} / ${subscription.listingLimit} active ads`
              : "Server limit unavailable"
          }
        />
        {subscription?.overLimit && (
          <Notice tone="error">
            Your active listings exceed the current server-side allowance. New posts remain blocked
            until this is resolved.
          </Notice>
        )}
        <Link
          to="/subscribe"
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-2.5 text-xs font-black text-brand-foreground"
        >
          Manage plan <ChevronRight className="h-4 w-4" />
        </Link>
      </Card>
      <Card title="Listing statistics" icon={ShoppingBag}>
        <InfoRow label="Active" value={String(counts.ACTIVE ?? 0)} />
        <InfoRow label="Paused" value={String(counts.PAUSED ?? 0)} />
        <InfoRow label="Sold / closed" value={String((counts.SOLD ?? 0) + (counts.CLOSED ?? 0))} />
        <InfoRow label="Total created" value={String(ads.length)} />
      </Card>
      <Card title="Manage listings" icon={BriefcaseIcon}>
        {ads.length ? (
          <div className="space-y-2">
            {ads.slice(0, 8).map((ad) => (
              <div
                key={ad.listingId}
                className="flex items-center gap-3 rounded-xl border border-border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{ad.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {ad.status} · ₦{ad.price.toLocaleString()}
                  </p>
                </div>
                <select
                  value={ad.status}
                  onChange={(event) =>
                    void changeStatus(
                      ad,
                      event.target.value as "ACTIVE" | "PAUSED" | "SOLD" | "UNAVAILABLE" | "CLOSED",
                    )
                  }
                  className="rounded-lg border border-border bg-background px-2 py-1.5 text-[11px]"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="SOLD">Sold</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            text="No listings have been created from this account yet."
            action="Post an advert"
            to="/post-product"
          />
        )}
      </Card>
    </div>
  );
}
function BriefcaseIcon({ className }: { className?: string }) {
  return <ShoppingBag className={className} />;
}
function BalancePage() {
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  useEffect(() => {
    void getWalletSummary()
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);
  return (
    <div className="space-y-4">
      <Card title="Available funds" icon={WalletCards}>
        <div className="rounded-2xl bg-foreground p-5 text-background">
          <p className="text-xs opacity-70">Cash balance</p>
          <p className="mt-1 text-3xl font-black">
            ₦{(summary?.cashBalance ?? 0).toLocaleString()}
          </p>
          <p className="mt-2 text-xs opacity-70">
            Pending: ₦{(summary?.pendingAmount ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="mt-3">
          <InfoRow
            label="Goall26 promotional credits"
            value={`₦${(summary?.promotionalCredits ?? 0).toLocaleString()}`}
          />
          <InfoRow label="Withdrawals" value="Shown only when the server supports seller payouts" />
        </div>
      </Card>
      <Link
        to="/wallet"
        className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-black"
      >
        Open Wallet <ExternalLink className="h-4 w-4" />
      </Link>
    </div>
  );
}
function PaymentsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void getTransactions()
      .then((items) => setTransactions(items as Transaction[]))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, []);
  return (
    <Card title="Verified transactions" icon={Receipt}>
      {loading ? (
        <Skeleton />
      ) : transactions.length ? (
        <div className="space-y-2">
          {transactions.map((item) => (
            <div key={item.id} className="rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">{item.serviceLabel}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {item.reference} · {formatDate(item.createdAt)}
                  </p>
                </div>
                <StatusBadge value={item.status} />
              </div>
              <p className="mt-2 text-sm font-black text-brand">₦{item.amount.toLocaleString()}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState text="No verified Goall26 service payments are available for this account." />
      )}
    </Card>
  );
}
function SubscriptionPage({
  onNotice,
}: {
  onNotice: (tone: "success" | "error", text: string) => void;
}) {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      setSubscription(await getSubscriptionSummary());
    } catch (error) {
      onNotice(
        "error",
        error instanceof Error ? error.message : "Subscription could not be loaded.",
      );
    }
  }, [onNotice]);
  useEffect(() => {
    void load();
  }, [load]);
  const toggle = async () => {
    if (!subscription) return;
    setBusy(true);
    try {
      await setSubscriptionAutoRenew({ data: { enabled: !subscription.autoRenew } });
      await load();
      onNotice("success", "Auto-renewal preference updated.");
    } catch (error) {
      onNotice(
        "error",
        error instanceof Error ? error.message : "Auto-renewal could not be updated.",
      );
    } finally {
      setBusy(false);
    }
  };
  const cancel = async () => {
    setBusy(true);
    try {
      await cancelSubscription();
      await load();
      onNotice("success", "Subscription cancellation request completed.");
    } catch (error) {
      onNotice(
        "error",
        error instanceof Error ? error.message : "Subscription could not be cancelled.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <Card title="Current plan" icon={CreditCard}>
        <InfoRow label="Plan" value={subscription?.tier ?? "FREE"} />
        <InfoRow label="Status" value={subscription?.status ?? "Unknown"} />
        <InfoRow
          label="Started"
          value={subscription?.startDate ? formatDate(subscription.startDate) : "Not available"}
        />
        <InfoRow
          label="Renewal / expiry"
          value={subscription?.renewalDate ? formatDate(subscription.renewalDate) : "Not available"}
        />
        <InfoRow
          label="Remaining"
          value={subscription ? `${subscription.remainingDays} days` : "Not available"}
        />
        <InfoRow
          label="Posts used"
          value={`${subscription?.activeListings ?? 0} / ${subscription?.listingLimit ?? "server limit"}`}
        />
      </Card>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={!subscription || busy}
          onClick={() => void toggle()}
          className="rounded-xl border border-border px-3 py-2.5 text-xs font-black"
        >
          Auto-renew: {subscription?.autoRenew ? "On" : "Off"}
        </button>
        <button
          type="button"
          disabled={!subscription || busy || subscription.status !== "ACTIVE"}
          onClick={() => void cancel()}
          className="rounded-xl border border-brand/30 px-3 py-2.5 text-xs font-black text-brand"
        >
          Cancel plan
        </button>
      </div>
      <Card title="Available plans" icon={Sparkles}>
        {SUBSCRIPTION_PLANS.map((plan) => (
          <div
            key={plan.tier}
            className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black">{plan.name}</p>
              <p className="text-[11px] text-muted-foreground">{plan.description}</p>
            </div>
            <span className="text-xs font-black">₦{plan.price.toLocaleString()}/month</span>
          </div>
        ))}
        <Link
          to="/subscribe"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-2.5 text-xs font-black text-brand-foreground"
        >
          Upgrade or renew <ChevronRight className="h-4 w-4" />
        </Link>
      </Card>
    </div>
  );
}
function BoostingPage() {
  return (
    <div className="space-y-4">
      <Card title="Boost workflow" icon={Sparkles}>
        <p className="text-sm leading-6 text-muted-foreground">
          Boosting is available only for an active listing and is activated after server-side
          Paystack verification. Select a listing from the Post New Ad or Wallet flow to begin.
        </p>
        <Link
          to="/post-product"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-2.5 text-xs font-black text-brand-foreground"
        >
          Manage listings <ChevronRight className="h-4 w-4" />
        </Link>
      </Card>
      <Card title="Active boosts" icon={Sparkles}>
        <EmptyState text="No active boost records are available for this account." />
      </Card>
    </div>
  );
}
function VerificationPage({ profile }: { profile: FarmXProfile }) {
  return (
    <Card title="Verification checklist" icon={BadgeCheck}>
      <VerificationRow
        label="Email account"
        value={profile.email ? "Available" : "Action required"}
      />
      <VerificationRow label="Phone number" value={profile.phone ? "Saved" : "Action required"} />
      <VerificationRow
        label="Identity verification"
        value={profile.verification.replaceAll("_", " ")}
      />
      <VerificationRow
        label="Business verification"
        value={profile.role === "agricultural_business" ? "Review in Company" : "Not started"}
      />
      <Link
        to="/verify"
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-2.5 text-xs font-black text-brand-foreground"
      >
        Open verification <ChevronRight className="h-4 w-4" />
      </Link>
    </Card>
  );
}
function VerificationRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
      <ShieldCheck className="h-4 w-4 text-brand" />
      <span className="min-w-0 flex-1 text-sm font-bold">{label}</span>
      <span className="text-xs capitalize text-muted-foreground">{value}</span>
    </div>
  );
}
function BlockedPage() {
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getMySettings()
      .then((res) => {
        if (!active) return;
        setBlockedUsers(res.settings?.blockedUsers ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const unblock = async (username: string) => {
    try {
      const current = await getMySettings();
      const base = current.settings ?? DEFAULT_FARMX_SETTINGS;
      const updated = (base.blockedUsers ?? []).filter((u: string) => u !== username);
      await saveMySettings({
        data: {
          notifications: base.notifications,
          communication: base.communication,
          buying: base.buying,
          country: base.country,
          currency: base.currency,
          dateFormat: base.dateFormat,
          timeFormat: base.timeFormat,
          marketplaceRadiusKm: base.marketplaceRadiusKm,
          blockedUsers: updated,
        },
      });
      setBlockedUsers(updated);
    } catch (err) {
      console.error("Failed to unblock user:", err);
    }
  };

  return (
    <Card title="Blocked users" icon={Users}>
      <p className="mb-3 text-xs leading-5 text-muted-foreground">
        Users you have blocked from messaging or interacting with your listings are shown below.
      </p>
      {loading ? (
        <Skeleton />
      ) : blockedUsers.length ? (
        blockedUsers.map((user: string) => (
          <div key={user} className="flex items-center justify-between border-b border-border py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-xs font-black text-brand">
                {user.slice(0, 1).toUpperCase()}
              </span>
              <span className="text-sm font-bold">{user}</span>
            </div>
            <button
              type="button"
              onClick={() => void unblock(user)}
              className="text-xs font-bold text-destructive hover:underline"
            >
              Unblock
            </button>
          </div>
        ))
      ) : (
        <EmptyState text="No blocked users are recorded in your account." />
      )}
    </Card>
  );
}
function SafetyPage() {
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-4">
      <Card title="Report a concern" icon={ShieldCheck}>
        <SelectField
          label="Report type"
          value={reason}
          options={["", "User", "Listing", "Message", "Payment or scam"]}
          onChange={setReason}
        />
        <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
          Reports are submitted only through supported Goall26 report actions. This page does not
          create a report record.
        </p>
        <Link
          to="/faq"
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-black"
        >
          Read safety guidance <CircleHelp className="h-4 w-4" />
        </Link>
      </Card>
      <Card title="Safety basics" icon={ShieldCheck}>
        <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
          <li>• Keep payments inside verified Goall26 flows.</li>
          <li>• Never share your password, OTP or private keys.</li>
          <li>• Meet safely and inspect products before handover.</li>
        </ul>
      </Card>
    </div>
  );
}
function ActivityPage() {
  return (
    <div className="space-y-4">
      <Card title="Account activity" icon={Activity}>
        <InfoRow label="Listings" value="Open My ads" />
        <InfoRow label="Saved ads" value="Open Saved ads" />
        <InfoRow label="Community and messages" value="Open the relevant app section" />
      </Card>
      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          to="/profile-center/$section"
          params={{ section: "ads" }}
          className="rounded-xl border border-border px-3 py-2.5 text-center text-xs font-black"
        >
          My ads
        </Link>
        <Link
          to="/community"
          className="rounded-xl border border-border px-3 py-2.5 text-center text-xs font-black"
        >
          Community
        </Link>
      </div>
    </div>
  );
}
function MarketActivityPage({ mode }: { mode: "saved" | "recent" }) {
  const [items, setItems] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const repository = await getMarketRepository();
      setItems(
        mode === "saved"
          ? await repository.getSavedListings()
          : await repository.getRecentlyViewed(),
      );
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [mode]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <Card
      title={mode === "saved" ? "Saved listings" : "Recently viewed listings"}
      icon={mode === "saved" ? Heart : MoreIcon}
    >
      {loading ? (
        <Skeleton />
      ) : items.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <Link
              to="/product/$id"
              params={{ id: item.id }}
              key={item.id}
              className="rounded-xl border border-border p-3 transition hover:border-brand"
            >
              <p className="truncate text-sm font-black">{item.title}</p>
              <p className="mt-1 text-xs font-bold text-brand">
                {item.price === null
                  ? (item.priceLabel ?? "Contact seller")
                  : `₦${item.price.toLocaleString()}`}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {item.city}, {item.state}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          text={mode === "saved" ? "No saved ads yet." : "No recently viewed listings yet."}
          action="Open Market"
          to="/market"
        />
      )}
    </Card>
  );
}
function MoreIcon({ className }: { className?: string }) {
  return <RefreshCw className={className} />;
}
function SavedSearchesPage() {
  const [snapshot, setSnapshot] = useState<string[]>([]);
  useEffect(() => {
    void getMarketRepository()
      .then((repo) => repo.getSnapshot())
      .then((data) => setSnapshot(data.recentSearches))
      .catch(() => setSnapshot([]));
  }, []);
  return (
    <Card title="Search history and saved searches" icon={Search}>
      {snapshot.length ? (
        <div className="space-y-2">
          {snapshot.map((query) => (
            <div
              key={query}
              className="flex items-center gap-3 rounded-xl border border-border p-3"
            >
              <Search className="h-4 w-4 text-brand" />
              <span className="flex-1 text-sm font-bold">{query}</span>
              <Link
                to="/market/search"
                search={{ q: query }}
                className="text-xs font-black text-brand"
              >
                Search
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          text="No saved searches are available from this account."
          action="Search Market"
          to="/market"
        />
      )}
    </Card>
  );
}
function SupportPage() {
  return (
    <div className="space-y-4">
      <Card title="Help centre" icon={CircleHelp}>
        <p className="text-sm leading-6 text-muted-foreground">
          Find answers about accounts, listings, payments, subscriptions, verification and safety in
          the Goall26 help centre.
        </p>
        <Link
          to="/faq"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-2.5 text-xs font-black text-brand-foreground"
        >
          Open Help Centre <ChevronRight className="h-4 w-4" />
        </Link>
      </Card>
      <Card title="Contact Goall26" icon={MessageCircle}>
        <p className="text-sm leading-6 text-muted-foreground">
          When a support-ticket backend is enabled, open and closed tickets will appear here. Until
          then, Goall26 will not invent ticket numbers or statuses.
        </p>
      </Card>
    </div>
  );
}
function LegalPage() {
  const documents = [
    "Terms of Service",
    "Privacy Policy",
    "Community Guidelines",
    "Marketplace Rules",
    "Seller Rules",
    "Buyer Rules",
    "Subscription Terms",
    "Payment Terms",
    "Refund Policy",
    "Prohibited Items",
    "Data deletion policy",
  ];
  return (
    <Card title="Goall26 policies" icon={FileText}>
      <div className="space-y-1">
        {documents.map((item) => (
          <div
            key={item}
            className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
          >
            <FileText className="h-4 w-4 text-brand" />
            <span className="flex-1 text-sm font-bold">{item}</span>
            <span className="text-[11px] text-muted-foreground">
              Available in the Goall26 policy centre
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
function AboutPage() {
  return (
    <div className="space-y-4">
      <Card title="Goall26" icon={Globe2}>
        <div className="flex items-center gap-3">
          <img src="/farmx-logo.png" alt="Goall26" className="h-14 w-14 rounded-2xl" />
          <div>
            <p className="text-lg font-black">Goall26 marketplace</p>
            <p className="text-xs text-muted-foreground">
              Agricultural products, services, jobs and community.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <InfoRow label="Version" value="1.0" />
          <InfoRow label="Country" value="Nigeria" />
          <InfoRow label="Currency" value="NGN ₦" />
        </div>
      </Card>
      <Card title="Official links" icon={ExternalLink}>
        <Link to="/faq" className="inline-flex items-center gap-2 text-xs font-black text-brand">
          Help Centre <ExternalLink className="h-4 w-4" />
        </Link>
      </Card>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-black">{title}</h2>
      </div>
      {children}
    </section>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
  hint,
  multiline = false,
  inputMode,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  hint?: string;
  multiline?: boolean;
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
      ) : (
        <input
          type={type}
          value={value}
          inputMode={inputMode}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand"
        />
      )}
      {hint && <span className="mt-1 block text-[10px] text-muted-foreground">{hint}</span>}
    </label>
  );
}
function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replaceAll("_", " ") || "Choose an option"}
          </option>
        ))}
      </select>
    </label>
  );
}
function Toggle({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
      <span className="flex-1 text-sm font-bold">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!value)}
        aria-pressed={value}
        className={`relative h-6 w-11 rounded-full transition ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${value ? "bg-brand" : "bg-muted-foreground/30"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${value ? "left-5.5" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
      <span className="flex-1 text-sm font-bold">{label}</span>
      <span className="max-w-[60%] text-right text-xs capitalize text-muted-foreground">
        {value}
      </span>
    </div>
  );
}
function VerificationRowPlaceholder() {
  return null;
}
function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-black capitalize ${value === "successful" ? "bg-emerald-100 text-emerald-800" : value === "failed" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}
    >
      {value}
    </span>
  );
}
function Notice({ tone, children }: { tone: "success" | "error"; children: ReactNode }) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${tone === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-950"}`}
      role="status"
    >
      {children}
    </div>
  );
}
function EmptyState({ text, action, to }: { text: string; action?: string; to?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-5 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      {action && to && (
        <Link to={to} className="mt-3 inline-flex items-center gap-1 text-xs font-black text-brand">
          {action} <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-center">
      <p className="text-sm font-bold text-amber-950">{message}</p>
      <button
        type="button"
        onClick={retry}
        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-400 px-3 py-2 text-xs font-black text-amber-950"
      >
        <RefreshCw className="h-4 w-4" /> Retry
      </button>
    </div>
  );
}
function Skeleton() {
  return <div className="h-24 animate-pulse rounded-xl bg-muted" />;
}
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(date);
}
