import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  useCompany,
  TIER_PRICING_NGN,
  TIER_META,
  type BadgeTier,
  type PersonalKYC,
  type CompanyProfile,
} from "@/lib/company-store";
import { COUNTRIES, convertFromNGN, formatFromNGN, formatMoney } from "@/lib/currency";
import { PayModal } from "@/components/PayModal";
import { BadgeCheck, ArrowLeft, ArrowRight, Check, Globe, Sparkles, Crown } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/upgrade")({ component: UpgradePage });

type Step = "tier" | "personal" | "company" | "pay" | "done";

function UpgradePage() {
  const { state, country, setCountry, savePersonal, saveCompany, activateTier } = useCompany();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("tier");
  const [tier, setTier] = useState<Exclude<BadgeTier, "none">>("bluetek");
  const [payOpen, setPayOpen] = useState(false);
  const [savedCompany, setSavedCompany] = useState<CompanyProfile | null>(null);

  const [personal, setPersonal] = useState<PersonalKYC>(
    state.personal ?? {
      fullName: "",
      productType: "",
      address: "",
      phone: "",
      photo: "👤",
      country: country.code,
      state: "",
      emergencyContact: "",
      email: "",
    },
  );

  const [company, setCompany] = useState<
    Omit<CompanyProfile, "slug" | "createdAt" | "followers" | "themeColor">
  >(
    state.company
      ? {
          cacNumber: state.company.cacNumber,
          name: state.company.name,
          logo: state.company.logo,
          bio: state.company.bio,
          address: state.company.address,
          email: state.company.email,
          ceo: state.company.ceo,
          phone: state.company.phone,
          productType: state.company.productType,
          country: state.company.country,
          state: state.company.state,
          gps: state.company.gps,
          partners: state.company.partners,
        }
      : {
          cacNumber: "",
          name: "",
          logo: "🌾",
          bio: "",
          address: "",
          email: "",
          ceo: "",
          phone: "",
          productType: "",
          country: country.code,
          state: "",
          gps: "",
          partners: [],
        },
  );

  const priceNGN = TIER_PRICING_NGN[tier];
  const localPriceLabel = useMemo(() => formatFromNGN(priceNGN, country), [priceNGN, country]);

  // Auto-fill company from personal
  const fillCompanyFromPersonal = () => {
    setCompany((c) => ({
      ...c,
      name: c.name || personal.fullName + " Enterprises",
      email: c.email || personal.email,
      ceo: c.ceo || personal.fullName,
      phone: c.phone || personal.phone,
      address: c.address || personal.address,
      country: personal.country,
      state: c.state || personal.state,
      productType: c.productType || personal.productType,
    }));
  };

  const canContinuePersonal =
    personal.fullName && personal.phone && personal.email && personal.country && personal.state;
  const canContinueCompany =
    company.name &&
    company.cacNumber &&
    company.ceo &&
    company.phone &&
    company.email &&
    company.country;

  return (
    <AppShell title="Upgrade">
      <div className="space-y-5">
        <button
          onClick={() => navigate({ to: "/company" })}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <Stepper step={step} />

        {step === "tier" && (
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Country</p>
              <div className="mt-1 flex items-center gap-2">
                <Globe className="h-4 w-4 text-brand" />
                <select
                  value={country.code}
                  onChange={(e) => {
                    const found = COUNTRIES.find((c) => c.code === e.target.value);
                    if (found) setCountry(found);
                  }}
                  className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.currency})
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Farashi zai canja bisa kudin ƙasarka.
              </p>
            </div>

            <h2 className="font-bold">Choose your verification tier</h2>
            {(Object.keys(TIER_META) as Array<Exclude<BadgeTier, "none">>).map((k) => {
              const meta = TIER_META[k];
              const picked = tier === k;
              return (
                <button
                  key={k}
                  onClick={() => setTier(k)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition ${picked ? "border-brand bg-brand/5" : "border-border"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {k === "platinum" ? (
                        <Crown className="h-5 w-5" style={{ color: meta.color }} />
                      ) : k === "gold" ? (
                        <Sparkles className="h-5 w-5" style={{ color: meta.color }} />
                      ) : (
                        <BadgeCheck className="h-5 w-5" style={{ color: meta.color }} />
                      )}
                      <p className="font-bold">{meta.label}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-brand">
                        {formatFromNGN(TIER_PRICING_NGN[k], country)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">/month</p>
                    </div>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {meta.perks.map((p) => (
                      <li
                        key={p}
                        className="text-xs text-muted-foreground flex items-start gap-1.5"
                      >
                        <Check className="h-3 w-3 mt-0.5 text-brand" /> {p}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}

            <button
              onClick={() => setStep("personal")}
              className="w-full py-3 rounded-xl bg-brand text-brand-foreground font-semibold flex items-center justify-center gap-2"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === "personal" && (
          <div className="space-y-3">
            <div>
              <h2 className="font-bold">Personal KYC</h2>
              <p className="text-xs text-muted-foreground">
                Wannan bayanan zamu kai su Company Profile din ka.
              </p>
            </div>
            <Field
              label="Full name"
              value={personal.fullName}
              onChange={(v) => setPersonal({ ...personal, fullName: v })}
            />
            <Field
              label="Email"
              value={personal.email}
              onChange={(v) => setPersonal({ ...personal, email: v })}
              type="email"
            />
            <Field
              label="Phone"
              value={personal.phone}
              onChange={(v) => setPersonal({ ...personal, phone: v })}
            />
            <Field
              label="Address"
              value={personal.address}
              onChange={(v) => setPersonal({ ...personal, address: v })}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wide">
                  Country
                </label>
                <select
                  value={personal.country}
                  onChange={(e) => setPersonal({ ...personal, country: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                label="State"
                value={personal.state}
                onChange={(v) => setPersonal({ ...personal, state: v })}
              />
            </div>
            <Field
              label="Product type"
              value={personal.productType}
              onChange={(v) => setPersonal({ ...personal, productType: v })}
              placeholder="e.g. Grains, Poultry"
            />
            <Field
              label="Emergency contact"
              value={personal.emergencyContact}
              onChange={(v) => setPersonal({ ...personal, emergencyContact: v })}
            />

            <div className="flex gap-2">
              <button
                onClick={() => setStep("tier")}
                className="flex-1 py-3 rounded-xl border border-border font-semibold"
              >
                Back
              </button>
              <button
                disabled={!canContinuePersonal}
                onClick={() => {
                  savePersonal(personal);
                  fillCompanyFromPersonal();
                  setStep("company");
                }}
                className="flex-1 py-3 rounded-xl bg-brand text-brand-foreground font-semibold disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === "company" && (
          <div className="space-y-3">
            <div>
              <h2 className="font-bold">Company details</h2>
              <p className="text-xs text-muted-foreground">Mun cika wasu fannoni daga KYC ɗinka.</p>
            </div>
            <Field
              label="Company name"
              value={company.name}
              onChange={(v) => setCompany({ ...company, name: v })}
            />
            <Field
              label="CAC / Reg. number"
              value={company.cacNumber}
              onChange={(v) => setCompany({ ...company, cacNumber: v })}
            />
            <Field
              label="CEO / Manager"
              value={company.ceo}
              onChange={(v) => setCompany({ ...company, ceo: v })}
            />
            <Field
              label="Email"
              value={company.email}
              onChange={(v) => setCompany({ ...company, email: v })}
              type="email"
            />
            <Field
              label="Phone"
              value={company.phone}
              onChange={(v) => setCompany({ ...company, phone: v })}
            />
            <Field
              label="Address"
              value={company.address}
              onChange={(v) => setCompany({ ...company, address: v })}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wide">
                  Country
                </label>
                <select
                  value={company.country}
                  onChange={(e) => setCompany({ ...company, country: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                label="State"
                value={company.state}
                onChange={(v) => setCompany({ ...company, state: v })}
              />
            </div>
            <Field
              label="Product type"
              value={company.productType}
              onChange={(v) => setCompany({ ...company, productType: v })}
            />
            <div>
              <label className="text-[11px] text-muted-foreground uppercase tracking-wide">
                Bio
              </label>
              <textarea
                value={company.bio}
                onChange={(e) => setCompany({ ...company, bio: e.target.value })}
                rows={3}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm"
                placeholder="One-line pitch about your company"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep("personal")}
                className="flex-1 py-3 rounded-xl border border-border font-semibold"
              >
                Back
              </button>
              <button
                disabled={!canContinueCompany}
                onClick={() => {
                  const saved = saveCompany(company);
                  setSavedCompany(saved);
                  setStep("pay");
                }}
                className="flex-1 py-3 rounded-xl bg-brand text-brand-foreground font-semibold disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === "pay" && savedCompany && (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-brand/5 border border-brand/30">
              <p className="text-xs uppercase text-muted-foreground">Order summary</p>
              <div className="mt-2 flex justify-between text-sm">
                <span>{TIER_META[tier].label} badge · monthly</span>
                <span className="font-bold text-brand">{localPriceLabel}</span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Base ₦{priceNGN.toLocaleString()} · billed in {country.currency} at local rate.
              </p>
            </div>
            <button
              onClick={() => setPayOpen(true)}
              className="w-full py-3 rounded-xl bg-brand text-brand-foreground font-semibold"
            >
              Pay {localPriceLabel}
            </button>
            <button
              onClick={() => setStep("company")}
              className="w-full py-3 rounded-xl border border-border font-semibold"
            >
              Back
            </button>
          </div>
        )}

        {step === "done" && savedCompany && (
          <div className="space-y-4 text-center py-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-brand/10 flex items-center justify-center">
              <BadgeCheck className="h-8 w-8 text-brand" />
            </div>
            <h2 className="text-xl font-bold">You're verified!</h2>
            <p className="text-sm text-muted-foreground">
              {TIER_META[tier].label} badge is now active on all your products.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/c/$slug"
                params={{ slug: savedCompany.slug }}
                className="py-3 rounded-xl bg-brand text-brand-foreground font-semibold"
              >
                View mini site
              </Link>
              <Link to="/company" className="py-3 rounded-xl border border-border font-semibold">
                Manage company
              </Link>
            </div>
          </div>
        )}
      </div>

      <PayModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title={`${TIER_META[tier].label} badge — monthly`}
        amountNaira={priceNGN}
        purpose={{ kind: "bluetek_subscription", companyId: savedCompany?.slug ?? "pending" }}
        onPaid={(_via, ref) => {
          activateTier(tier, ref);
          setStep("done");
        }}
      />
    </AppShell>
  );
}

function Stepper({ step }: { step: Step }) {
  const order: Step[] = ["tier", "personal", "company", "pay", "done"];
  const idx = order.indexOf(step);
  return (
    <div className="flex items-center gap-1.5">
      {order.slice(0, 4).map((s, i) => (
        <div
          key={s}
          className={`flex-1 h-1.5 rounded-full ${i <= idx ? "bg-brand" : "bg-border"}`}
        />
      ))}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-sm"
      />
    </div>
  );
}

export { formatMoney }; // silence unused-import lint if not referenced
