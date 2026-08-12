import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useCompany, type PersonalKYC } from "@/lib/company-store";
import { LOCATIONS } from "@/lib/mock-data";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/edit-profile")({ component: EditProfile });

const fallbackProfile: PersonalKYC = {
  fullName: "Ibrahim Bello",
  productType: "Farmer",
  address: "12 Sabon Gari",
  phone: "+234 812 345 6789",
  photo: "IB",
  country: "NG",
  state: "Kano",
  emergencyContact: "",
  email: "ibrahim@farmx.app",
};

function EditProfile() {
  const { t } = useI18n();
  const { state: companyState, savePersonal } = useCompany();
  const [form, setForm] = useState<PersonalKYC>(fallbackProfile);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (companyState.personal) setForm(companyState.personal);
  }, [companyState.personal]);

  const update = (key: keyof PersonalKYC, value: string) => {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = () => {
    savePersonal(form);
    setSaved(true);
  };

  return (
    <AppShell>
      <div className="space-y-4 pb-6">
        <Link
          to="/profile"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to profile
        </Link>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-sm font-black text-brand">
              {form.photo.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold">{t("editProfile")}</h1>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Keep your contact details correct so buyers and sellers can reach you safely inside
                FarmX.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-bold">Personal information</h2>
          <Field
            label="Full name"
            value={form.fullName}
            onChange={(value) => update("fullName", value)}
          />
          <Field
            label="Phone number"
            type="tel"
            value={form.phone}
            onChange={(value) => update("phone", value)}
          />
          <Field
            label="Email address"
            type="email"
            value={form.email}
            onChange={(value) => update("email", value)}
          />
          <Field
            label="What do you do?"
            value={form.productType}
            onChange={(value) => update("productType", value)}
          />
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-bold">Location</h2>
          <Field
            label="Address"
            value={form.address}
            onChange={(value) => update("address", value)}
          />
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">State</span>
            <select
              value={form.state}
              onChange={(event) => update("state", event.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand"
            >
              {LOCATIONS.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Emergency contact (optional)"
            type="tel"
            value={form.emergencyContact}
            onChange={(value) => update("emergencyContact", value)}
          />
        </section>

        <section className="flex items-start gap-2 rounded-2xl border border-brand/20 bg-brand/5 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <p className="text-xs leading-5 text-muted-foreground">
            Your changes are saved to your FarmX profile on this device. Identity checks and secure
            sign-in remain protected by your configured account service.
          </p>
        </section>

        <button
          onClick={submit}
          disabled={!form.fullName.trim() || !form.phone.trim() || !form.email.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-brand-foreground disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" /> Save changes
        </button>
        {saved && (
          <p className="text-center text-xs font-semibold text-green-600">
            Profile changes saved successfully.
          </p>
        )}
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "tel";
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand"
      />
    </label>
  );
}
