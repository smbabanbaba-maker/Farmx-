import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { partners, products, jobs, PRICING } from "@/lib/mock-data";
import {
  BadgeCheck,
  Users2,
  TrendingUp,
  Link as LinkIcon,
  Plus,
  MapPin,
  Loader2,
  Check,
  X,
  Copy,
  Sparkles,
  Crown,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { PayModal } from "@/components/PayModal";
import { useCompany, TIER_META } from "@/lib/company-store";

export const Route = createFileRoute("/company")({ component: CompanyPage });

interface CompanyKYC {
  name: string;
  ceo: string;
  email: string;
  phone: string;
  address: string;
  state: string;
  country: string;
  gps: string;
  partners: string[];
}

function CompanyPage() {
  const { t } = useI18n();
  const [kycOpen, setKycOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [company, setCompany] = useState<CompanyKYC | null>({
    name: "GreenFields Ltd",
    ceo: "Musa Bello",
    email: "info@greenfields.com",
    phone: "+234 803 000 0000",
    address: "12 Farm Road",
    state: "Kano",
    country: "Nigeria",
    gps: "12.0022, 8.5920",
    partners: ["Aisha M.", "Ibrahim K."],
  });
  const [bluetekActive, setBluetekActive] = useState(true);
  const [copied, setCopied] = useState(false);

  const uniqueLink = company
    ? `www.${company.name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com.farmx`
    : "";

  const copyLink = () => {
    if (!uniqueLink) return;
    navigator.clipboard?.writeText(uniqueLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const { state: cState, isBadgeActive } = useCompany();
  const activeTier = isBadgeActive() && cState.tier !== "none" ? cState.tier : null;
  const tierMeta = activeTier ? TIER_META[activeTier] : null;

  return (
    <AppShell title={t("company")}>
      <div className="space-y-5">
        {!activeTier && (
          <Link
            to="/upgrade"
            className="block p-4 rounded-2xl bg-gradient-to-r from-brand to-black text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4" />
                  <p className="font-bold text-sm">Upgrade to get verified</p>
                </div>
                <p className="text-[11px] text-white/80 mt-0.5">
                  Bluetek · Gold · Platinum — starts at ₦4,500/mo
                </p>
              </div>
              <span className="text-xs font-bold">Start →</span>
            </div>
          </Link>
        )}
        {activeTier && cState.company && tierMeta && (
          <Link
            to="/c/$slug"
            params={{ slug: cState.company.slug }}
            className="flex items-center justify-between p-3 rounded-xl bg-card border border-border"
          >
            <div className="flex items-center gap-2">
              {activeTier === "platinum" ? (
                <Crown className="h-4 w-4" style={{ color: tierMeta.color }} />
              ) : activeTier === "gold" ? (
                <Sparkles className="h-4 w-4" style={{ color: tierMeta.color }} />
              ) : (
                <BadgeCheck className="h-4 w-4" style={{ color: tierMeta.color }} />
              )}
              <div>
                <p className="text-sm font-bold">{tierMeta.label} verified</p>
                <p className="text-[11px] text-muted-foreground">View your mini website</p>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}
        {!company ? (
          <button
            onClick={() => setKycOpen(true)}
            className="w-full p-5 rounded-2xl border-2 border-dashed border-border text-center hover:border-brand"
          >
            <Plus className="h-6 w-6 mx-auto text-brand" />
            <p className="mt-2 font-semibold">Ƙirƙiri Kamfani</p>
            <p className="text-xs text-muted-foreground">KYC + Verified Seller kafin ka fara</p>
          </button>
        ) : (
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-brand to-black" />
            <div className="p-4 -mt-8">
              <div className="h-16 w-16 rounded-2xl bg-white border-4 border-card flex items-center justify-center text-3xl shadow-lg">
                🌾
              </div>
              <div className="mt-2 flex items-center gap-1">
                <h2 className="font-bold text-lg">{company.name}</h2>
                {bluetekActive && <BadgeCheck className="h-4 w-4 text-brand" />}
              </div>
              <p className="text-xs text-muted-foreground">CEO: {company.ceo}</p>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3" /> {company.state}, {company.country} · {company.gps}
              </div>
              <button
                onClick={copyLink}
                className="mt-2 text-xs text-brand flex items-center gap-1"
              >
                <LinkIcon className="h-3 w-3" /> {uniqueLink}
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="Followers" value="12.4k" icon={Users2} />
                <Stat label="Products" value="48" icon={TrendingUp} />
                <Stat label="Partners" value={String(company.partners.length)} icon={BadgeCheck} />
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setKycOpen(true)}
                  className="flex-1 py-2 rounded-lg border border-border text-sm font-semibold"
                >
                  Edit KYC
                </button>
                <button className="flex-1 py-2 rounded-lg bg-brand text-brand-foreground text-sm font-semibold">
                  Share
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bluetek subscription */}
        <div className="rounded-2xl p-4 border border-brand/40 bg-brand/5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <BadgeCheck className="h-4 w-4 text-brand" />
                <p className="font-bold text-sm">Bluetek Verified Badge</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Wata-wata · ₦{PRICING.bluetekMonthly.toLocaleString()}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Yana ba wa masu saye tabbaci akan kamfaninka.
              </p>
            </div>
            {bluetekActive ? (
              <span className="text-[10px] px-2 py-1 rounded-full bg-brand text-brand-foreground font-bold">
                ACTIVE
              </span>
            ) : (
              <button
                onClick={() => setPayOpen(true)}
                className="text-xs px-3 py-1.5 rounded-lg bg-brand text-brand-foreground font-semibold"
              >
                Subscribe
              </button>
            )}
          </div>
          {bluetekActive && (
            <button
              onClick={() => setBluetekActive(false)}
              className="mt-3 text-[11px] text-muted-foreground underline"
            >
              Cancel subscription
            </button>
          )}
        </div>

        <section>
          <h3 className="font-bold mb-2">Products</h3>
          <div className="grid grid-cols-3 gap-2">
            {products.slice(0, 3).map((p) => (
              <div key={p.id} className="rounded-lg bg-card border border-border p-2 text-center">
                <div className="text-3xl">{p.image}</div>
                <p className="text-[11px] font-medium mt-1 truncate">{p.name}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-bold mb-2">Open Jobs</h3>
          <div className="space-y-2">
            {jobs.slice(0, 2).map((j) => (
              <div
                key={j.id}
                className="p-3 rounded-xl bg-card border border-border flex justify-between"
              >
                <div>
                  <p className="text-sm font-semibold">{j.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {j.location} · {j.type}
                  </p>
                </div>
                <span className="text-xs font-bold text-brand self-center">{j.salary}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-bold mb-2">Partners</h3>
          <div className="space-y-2">
            {partners.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-xl bg-card border border-border flex items-center gap-3"
              >
                <div className="text-2xl">{p.logo}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-semibold">{p.name}</p>
                    {p.verified && <BadgeCheck className="h-3.5 w-3.5 text-brand" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{p.type}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <KYCModal
        open={kycOpen}
        onClose={() => setKycOpen(false)}
        initial={company}
        onSave={(c) => {
          setCompany(c);
          setKycOpen(false);
        }}
      />

      <PayModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Bluetek Verified Badge (monthly)"
        amountNaira={PRICING.bluetekMonthly}
        purpose={{ kind: "bluetek_subscription", companyId: "company_1" }}
        onPaid={() => setBluetekActive(true)}
      />
    </AppShell>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Users2 }) {
  return (
    <div className="p-2 rounded-lg bg-muted">
      <Icon className="h-3.5 w-3.5 mx-auto text-brand" />
      <p className="text-sm font-bold mt-0.5">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function KYCModal({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial: CompanyKYC | null;
  onSave: (c: CompanyKYC) => void;
}) {
  const [f, setF] = useState<CompanyKYC>(
    initial ?? {
      name: "",
      ceo: "",
      email: "",
      phone: "",
      address: "",
      state: "",
      country: "Nigeria",
      gps: "",
      partners: [],
    },
  );
  const [partnerInput, setPartnerInput] = useState("");
  const [gpsBusy, setGpsBusy] = useState(false);

  if (!open) return null;

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setF({
          ...f,
          gps: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
        });
        setGpsBusy(false);
      },
      () => setGpsBusy(false),
    );
  };

  const addPartner = () => {
    if (partnerInput.trim()) {
      setF({ ...f, partners: [...f.partners, partnerInput.trim()] });
      setPartnerInput("");
    }
  };

  const canSave = f.name && f.ceo && f.email && f.phone && f.address && f.state && f.country;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <h3 className="font-bold">Company KYC</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {(
            [
              ["name", "Company name"],
              ["ceo", "CEO name"],
              ["email", "Email"],
              ["phone", "Phone number"],
              ["address", "Address"],
              ["state", "State"],
              ["country", "Country"],
            ] as const
          ).map(([k, label]) => (
            <div key={k}>
              <label className="text-[11px] text-muted-foreground uppercase tracking-wide">
                {label}
              </label>
              <input
                value={f[k]}
                onChange={(e) => setF({ ...f, [k]: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm"
              />
            </div>
          ))}
          <div>
            <label className="text-[11px] text-muted-foreground uppercase tracking-wide">
              Location (GPS)
            </label>
            <div className="mt-1 flex gap-2">
              <input
                value={f.gps}
                onChange={(e) => setF({ ...f, gps: e.target.value })}
                placeholder="lat, lng"
                className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm"
              />
              <button
                type="button"
                onClick={useMyLocation}
                className="px-3 py-2 rounded-lg border border-border text-xs font-semibold flex items-center gap-1"
              >
                {gpsBusy ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <MapPin className="h-3 w-3" />
                )}{" "}
                Auto
              </button>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground uppercase tracking-wide">
              Partners
            </label>
            <div className="mt-1 flex gap-2">
              <input
                value={partnerInput}
                onChange={(e) => setPartnerInput(e.target.value)}
                placeholder="Partner name"
                className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm"
              />
              <button
                type="button"
                onClick={addPartner}
                className="px-3 py-2 rounded-lg bg-brand text-brand-foreground text-xs font-semibold"
              >
                Add
              </button>
            </div>
            {f.partners.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {f.partners.map((p, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2 py-1 rounded-full bg-muted flex items-center gap-1"
                  >
                    {p}
                    <button
                      onClick={() => setF({ ...f, partners: f.partners.filter((_, j) => j !== i) })}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="sticky bottom-0 bg-card border-t border-border p-4">
          <button
            disabled={!canSave}
            onClick={() => canSave && onSave(f)}
            className="w-full py-2.5 rounded-xl bg-brand text-brand-foreground font-semibold disabled:opacity-50"
          >
            Save KYC
          </button>
        </div>
      </div>
    </div>
  );
}
