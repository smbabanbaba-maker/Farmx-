import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ListingImage } from "@/components/ListingImage";
import { getMyProfile, saveMyBusinessProfile } from "@/lib/profile.functions";
import { useI18n } from "@/lib/i18n";
import { BadgeCheck, Building2, Copy, ExternalLink, Loader2, MapPin, Save, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/company")({ component: CompanyPage });

type BusinessForm = {
  name: string;
  description: string;
  category: string;
  businessType: string;
  phone: string;
  email: string;
  address: string;
  state: string;
  lga: string;
  website: string;
  socialLinks: string[];
  yearsInBusiness: number;
  services: string[];
  logoKey?: string;
  coverKey?: string;
};

function emptyBusiness(profile?: {
  fullName?: string;
  phone?: string;
  email?: string;
  state?: string;
}): BusinessForm {
  return {
    name: "",
    description: "",
    category: "",
    businessType: "",
    phone: profile?.phone ?? "",
    email: profile?.email ?? "",
    address: "",
    state: profile?.state ?? "",
    lga: "",
    website: "",
    socialLinks: [],
    yearsInBusiness: 0,
    services: [],
  };
}

function CompanyPage() {
  const { t } = useI18n();
  const [data, setData] = useState<Awaited<ReturnType<typeof getMyProfile>> | null>(null);
  const [form, setForm] = useState<BusinessForm>(emptyBusiness());
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const next = await getMyProfile();
      setData(next);
      setForm((current) => ({
        ...emptyBusiness(next.profile),
        ...(next.profile.business ?? current),
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load company profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const profile = data?.profile;
  const business = profile?.business;
  const listings = data?.activeListings ?? [];
  const companyName = business?.name || profile?.fullName || "FarmX business";
  const slug = profile?.username;
  const companyUrl = useMemo(() => (slug ? `${window.location.origin}/c/${slug}` : ""), [slug]);

  const update = <K extends keyof BusinessForm>(key: K, value: BusinessForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Enter a business name.");
      return;
    }
    setSaving(true);
    try {
      await saveMyBusinessProfile({ data: form });
      toast.success("Business profile saved.");
      setEditing(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save business profile.");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    if (!companyUrl) return;
    await navigator.clipboard?.writeText(companyUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <AppShell title={t("company")}>
        <div className="flex min-h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={t("company")}>
      <div className="space-y-5 pb-10">
        {!business && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="w-full rounded-2xl border-2 border-dashed border-border p-6 text-center hover:border-brand"
          >
            <Building2 className="mx-auto h-8 w-8 text-brand" />
            <p className="mt-2 text-sm font-bold">Create your business profile</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add real business information for buyers and customers.
            </p>
          </button>
        )}

        {business && !editing && (
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="h-24 bg-gradient-to-r from-red-100 via-white to-red-200">
              {business.coverKey && (
                <ListingImage
                  src={business.coverKey}
                  alt={`${companyName} cover`}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="-mt-8 p-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-white shadow-lg">
                {business.logoKey ? (
                  <ListingImage
                    src={business.logoKey}
                    alt={`${companyName} logo`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 className="h-7 w-7 text-brand" />
                )}
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <h2 className="text-lg font-bold">{companyName}</h2>
                {profile?.verification === "approved" && (
                  <BadgeCheck className="h-4 w-4 text-brand" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {business.businessType || business.category}
              </p>
              {(business.lga || business.state) && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {business.lga}, {business.state}
                </p>
              )}
              {business.description && (
                <p className="mt-3 text-sm leading-6">{business.description}</p>
              )}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Stat label="Active listings" value={String(data?.stats.activeAds ?? 0)} />
                <Stat label="Followers" value={String(data?.stats.followers ?? 0)} />
                <Stat label="Views" value={String(data?.stats.totalAdViews ?? 0)} />
              </div>
              <div className="mt-4 flex gap-2">
                {slug && (
                  <Link
                    to="/c/$slug"
                    params={{ slug }}
                    className="flex-1 rounded-xl bg-brand py-2.5 text-center text-xs font-bold text-brand-foreground"
                  >
                    View public page
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex-1 rounded-xl border border-border py-2.5 text-xs font-bold"
                >
                  Edit profile
                </button>
              </div>
              {companyUrl && (
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="mt-3 flex items-center gap-1 text-xs text-brand"
                >
                  <Copy className="h-3 w-3" /> {copied ? "Copied" : companyUrl}
                </button>
              )}
            </div>
          </section>
        )}

        {editing && (
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold">Business profile</h2>
              <button type="button" onClick={() => setEditing(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <Input
                label="Business name"
                value={form.name}
                onChange={(value) => update("name", value)}
              />
              <Input
                label="Business type"
                value={form.businessType}
                onChange={(value) => update("businessType", value)}
              />
              <Input
                label="Category"
                value={form.category}
                onChange={(value) => update("category", value)}
              />
              <Input
                label="Description"
                value={form.description}
                onChange={(value) => update("description", value)}
                multiline
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(value) => update("phone", value)}
              />
              <Input
                label="Email"
                value={form.email}
                onChange={(value) => update("email", value)}
              />
              <Input
                label="Address"
                value={form.address}
                onChange={(value) => update("address", value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="State"
                  value={form.state}
                  onChange={(value) => update("state", value)}
                />
                <Input label="LGA" value={form.lga} onChange={(value) => update("lga", value)} />
              </div>
              <Input
                label="Website"
                value={form.website}
                onChange={(value) => update("website", value)}
              />
              <Input
                label="Years in business"
                type="number"
                value={String(form.yearsInBusiness)}
                onChange={(value) => update("yearsInBusiness", Number(value) || 0)}
              />
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-brand-foreground disabled:opacity-60"
              >
                <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save business profile"}
              </button>
            </div>
          </section>
        )}

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">Seller verification</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Status:{" "}
                {profile?.verification === "approved"
                  ? "Verified"
                  : profile?.verification === "pending"
                    ? "Pending review"
                    : "Not verified"}
              </p>
            </div>
            <Link to="/verify" className="text-xs font-bold text-brand">
              Open verification
            </Link>
          </div>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-bold">Your active listings</h3>
            <span className="text-xs text-muted-foreground">{listings.length}</span>
          </div>
          {listings.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              No active listings yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {listings.map((listing) => (
                <Link
                  key={listing.id}
                  to="/product/$id"
                  params={{ id: listing.id }}
                  className="overflow-hidden rounded-xl border border-border bg-card"
                >
                  <ListingImage
                    src={listing.images[0]}
                    alt={listing.title}
                    className="h-32 w-full object-cover"
                  />
                  <div className="p-3">
                    <p className="truncate text-xs font-bold">{listing.title}</p>
                    <p className="mt-1 text-sm font-black text-brand">
                      ₦{listing.price.toLocaleString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <Link
          to="/verify"
          className="flex items-center justify-between rounded-xl border border-border bg-card p-4 text-xs font-bold"
        >
          <span>Company verification and KYC</span>
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
    </AppShell>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  multiline?: boolean;
}) {
  return (
    <label className="block text-xs font-semibold">
      {label}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal"
        />
      )}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="font-bold">{value}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
