import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/edit-profile")({ component: EditProfile });

function EditProfile() {
  const { t } = useI18n();
  const fields = [
    { label: "Full Name", value: "Ibrahim Bello" },
    { label: "Phone Number", value: "+234 812 345 6789" },
    { label: "Email", value: "ibrahim@farmx.app" },
    { label: "Address", value: "12 Sabon Gari" },
    { label: "Country", value: "Nigeria" },
    { label: "State", value: "Kano" },
    { label: "City", value: "Kano" },
  ];
  return (
    <AppShell>
      <div className="space-y-4">
        <Link
          to="/profile"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold">{t("editProfile")}</h1>
        <div className="space-y-3">
          {fields.map((f) => (
            <label key={f.label} className="block">
              <span className="text-xs font-semibold text-muted-foreground">{f.label}</span>
              <input
                defaultValue={f.value}
                className="mt-1 w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:border-brand"
              />
            </label>
          ))}
        </div>
        <button className="w-full py-3 rounded-xl bg-brand text-brand-foreground font-semibold">
          Save Changes
        </button>
      </div>
    </AppShell>
  );
}
