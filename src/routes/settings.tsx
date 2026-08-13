import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n, LANGUAGES, type Lang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { usePrefs } from "@/lib/prefs";
import { useCompany } from "@/lib/company-store";
import {
  User,
  Building2,
  BadgeCheck,
  Phone,
  Mail,
  Languages,
  Share2,
  MessageSquareOff,
  StarOff,
  PhoneCall,
  Bell,
  Moon,
  KeyRound,
  Trash2,
  LogOut,
  Info,
  Wifi,
  Star,
  ChevronRight,
  ShieldCheck,
  X,
  ExternalLink,
} from "lucide-react";
import { useState, type ReactNode } from "react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — FarmX" },
      {
        name: "description",
        content:
          "Control your FarmX personal and business info, verification, language, notifications, privacy and account options.",
      },
      { property: "og:title", content: "FarmX Settings" },
      {
        property: "og:description",
        content: "Language, notifications, privacy and account controls.",
      },
    ],
  }),
  component: SettingsPage,
});

type Panel = "security" | "delete" | "about" | "rating" | null;

function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const { mode, setMode } = useTheme();
  const { toggles, setToggle } = usePrefs();
  const { state: companyState } = useCompany();
  const navigate = useNavigate();
  const [langOpen, setLangOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [deletePhrase, setDeletePhrase] = useState("");

  const profile = companyState.personal;
  const fullName = profile?.fullName ?? "Ibrahim Bello";
  const phone = profile?.phone ?? "+234 800 000 0000";
  const email = profile?.email ?? "ibrahim@farmx.app";
  const companyName = companyState.company?.name ?? "Add business information";

  const ping = async () => {
    const start = Date.now();
    try {
      await fetch("/favicon.png", { cache: "no-store" });
      setNote(`✓ ${t("checkConnection")} — ${Date.now() - start}ms`);
    } catch {
      setNote(`✕ ${t("checkConnection")}`);
    }
  };

  const logOut = () => {
    try {
      localStorage.removeItem("farmx-session-active");
    } catch {
      /* local session may be unavailable */
    }
    navigate({ to: "/" });
  };

  const removeDeviceData = () => {
    if (deletePhrase !== "DELETE") return;
    try {
      [
        "farmx-company-state-v1",
        "farmx-prefs-v1",
        "farmx-messages-v2",
        "farmx-messages-v3",
        "farmx-notifications-v1",
      ].forEach((key) => localStorage.removeItem(key));
    } catch {
      /* no local storage available */
    }
    setPanel(null);
    setNote(
      "Data saved on this device has been removed. For full account deletion, contact FarmX support from your verified account.",
    );
    navigate({ to: "/" });
  };

  return (
    <AppShell title={t("settings")}>
      <div className="space-y-4 pb-6">
        <section className="rounded-2xl border border-brand/20 bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-sm font-black text-brand-foreground">
              {fullName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{fullName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {profile?.state ?? "Kano"}, Nigeria · {profile?.productType ?? "Farmer"}
              </p>
            </div>
            <Link
              to="/profile"
              className="rounded-lg border border-brand/30 px-2.5 py-1.5 text-xs font-bold text-brand"
            >
              Profile
            </Link>
          </div>
        </section>

        <Group title="Account & business">
          <Row
            icon={User}
            label={t("personalInfo")}
            value="Edit profile"
            onClick={() => navigate({ to: "/edit-profile" })}
          />
          <Row
            icon={Building2}
            label={t("businessInfo")}
            value={companyName}
            onClick={() => navigate({ to: "/company" })}
          />
          <Row
            icon={BadgeCheck}
            label={t("verifiedBadge")}
            value={companyState.tier === "none" ? "Get subscribed" : "Active"}
            onClick={() => navigate({ to: "/subscribe" })}
          />
          <Row
            icon={Phone}
            label={t("phoneNumbers")}
            value={phone}
            onClick={() => navigate({ to: "/edit-profile" })}
          />
          <Row
            icon={Mail}
            label={t("changeEmail")}
            value={email}
            onClick={() => navigate({ to: "/edit-profile" })}
          />
        </Group>

        <Group title="Preferences">
          <Row
            icon={Languages}
            label={t("changeLanguage")}
            value={LANGUAGES.find((item) => item.code === lang)?.label}
            onClick={() => setLangOpen((open) => !open)}
          />
          {langOpen && (
            <div className="grid grid-cols-2 gap-2 bg-accent/30 p-3">
              {LANGUAGES.map((language) => (
                <button
                  key={language.code}
                  onClick={() => {
                    setLang(language.code as Lang);
                    setLangOpen(false);
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${lang === language.code ? "border-brand bg-brand text-brand-foreground" : "border-border bg-background hover:border-brand/40"}`}
                >
                  {language.label}
                </button>
              ))}
            </div>
          )}
          <Row
            icon={Bell}
            label="Notification centre"
            value="Channels & push alerts"
            onClick={() => navigate({ to: "/notifications" })}
          />
          <Toggle
            icon={Bell}
            label="Enable notifications"
            on={!!toggles.notifications}
            set={(value) => setToggle("notifications", value)}
          />
          <Toggle
            icon={Share2}
            label={t("autoAdSharing")}
            on={!!toggles.autoAdSharing}
            set={(value) => setToggle("autoAdSharing", value)}
          />
          <Toggle
            icon={MessageSquareOff}
            label={t("disableChats")}
            on={!!toggles.disableChats}
            set={(value) => setToggle("disableChats", value)}
          />
          <Toggle
            icon={StarOff}
            label={t("disableFeedback")}
            on={!!toggles.disableFeedback}
            set={(value) => setToggle("disableFeedback", value)}
          />
          <Toggle
            icon={PhoneCall}
            label={t("inAppCalls")}
            on={!!toggles.inAppCalls}
            set={(value) => setToggle("inAppCalls", value)}
          />
          <Toggle
            icon={Moon}
            label={t("darkMode")}
            on={mode === "dark"}
            set={(value) => setMode(value ? "dark" : "light")}
          />
        </Group>

        <Group title="Security & support">
          <Row
            icon={KeyRound}
            label={t("changePassword")}
            value="Cognito account"
            onClick={() => setPanel("security")}
          />
          <Row
            icon={ShieldCheck}
            label="Buyer protection"
            value="Orders, escrow & disputes"
            onClick={() => navigate({ to: "/buyer-protection" })}
          />
          <Row
            icon={Info}
            label={t("aboutApp")}
            value="FarmX v1.0"
            onClick={() => setPanel("about")}
          />
          <Row icon={Wifi} label={t("checkConnection")} onClick={ping} />
          <Row
            icon={Star}
            label={t("rateUs")}
            value="Share feedback"
            onClick={() => setPanel("rating")}
          />
        </Group>

        <Group>
          <Row icon={Trash2} label={t("deleteAccount")} danger onClick={() => setPanel("delete")} />
          <Row icon={LogOut} label={t("logout")} danger onClick={logOut} />
        </Group>

        {note && (
          <p className="rounded-xl bg-brand/5 px-3 py-2 text-center text-xs font-semibold text-brand">
            {note}
          </p>
        )}

        <Link to="/profile" className="block text-center text-xs text-muted-foreground">
          ← {t("profile")}
        </Link>
      </div>

      {panel && (
        <AccountPanel
          panel={panel}
          close={() => {
            setPanel(null);
            setDeletePhrase("");
          }}
          deletePhrase={deletePhrase}
          setDeletePhrase={setDeletePhrase}
          removeDeviceData={removeDeviceData}
        />
      )}
    </AppShell>
  );
}

function Group({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <section>
      {title && (
        <h2 className="mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      )}
      <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
        {children}
      </div>
    </section>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  onClick,
  danger,
}: {
  icon: typeof User;
  label: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-accent active:scale-[0.99] ${danger ? "text-brand" : ""}`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${danger ? "" : "text-brand"}`} />
      <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
      {value && (
        <span className="max-w-32 truncate text-[11px] text-muted-foreground">{value}</span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function Toggle({
  icon: Icon,
  label,
  on,
  set,
}: {
  icon: typeof User;
  label: string;
  on: boolean;
  set: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <Icon className="h-4 w-4 text-brand" />
      <span className="flex-1 text-sm font-medium">{label}</span>
      <button
        onClick={() => set(!on)}
        aria-pressed={on}
        aria-label={`${label}: ${on ? "on" : "off"}`}
        className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-brand" : "bg-muted-foreground/30"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${on ? "left-5.5" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}

function AccountPanel({
  panel,
  close,
  deletePhrase,
  setDeletePhrase,
  removeDeviceData,
}: {
  panel: Exclude<Panel, null>;
  close: () => void;
  deletePhrase: string;
  setDeletePhrase: (value: string) => void;
  removeDeviceData: () => void;
}) {
  const content = {
    security: {
      title: "Password & sign-in",
      body: "FarmX keeps account sign-in protected through AWS Cognito. To change a live password, use the password reset option from the Cognito sign-in screen linked to your verified email address.",
    },
    about: {
      title: "About FarmX",
      body: "FarmX is a Nigerian agricultural marketplace for buying, selling, messaging, secure payments and delivery coordination. Version 1.0 uses Paystack-ready payments and AWS-ready data services.",
    },
    rating: {
      title: "Rate FarmX",
      body: "Your feedback helps make FarmX safer and more useful for farmers, buyers and agribusinesses. You can send feedback from the Community page or contact support through the app.",
    },
  } as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center"
      onClick={close}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold">
              {panel === "delete" ? "Remove account data" : content[panel].title}
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {panel === "delete"
                ? "This removes FarmX information stored on this device, including saved ads, chats and local profile settings. It does not delete a live AWS Cognito account."
                : content[panel].body}
            </p>
          </div>
          <button onClick={close} className="rounded-full p-1.5 hover:bg-accent" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {panel === "security" && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-brand/20 bg-brand/5 p-3 text-xs font-semibold text-brand">
            <ExternalLink className="h-4 w-4" /> Use the verified-email password reset during
            sign-in.
          </div>
        )}

        {panel === "delete" && (
          <label className="mt-4 block">
            <span className="text-xs font-semibold text-muted-foreground">
              Type DELETE to continue
            </span>
            <input
              value={deletePhrase}
              onChange={(event) => setDeletePhrase(event.target.value)}
              placeholder="DELETE"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </label>
        )}

        <div className="mt-5 flex gap-2">
          <button onClick={close} className="flex-1 rounded-xl bg-muted py-2.5 text-sm font-bold">
            Close
          </button>
          {panel === "delete" && (
            <button
              onClick={removeDeviceData}
              disabled={deletePhrase !== "DELETE"}
              className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-bold text-brand-foreground disabled:opacity-40"
            >
              Remove local data
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
