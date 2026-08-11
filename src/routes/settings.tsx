import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n, LANGUAGES, type Lang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { usePrefs } from "@/lib/prefs";
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
} from "lucide-react";
import { useState } from "react";

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

function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const { mode, setMode } = useTheme();
  const { toggles, setToggle } = usePrefs();
  const navigate = useNavigate();
  const [langOpen, setLangOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const ping = async () => {
    const start = Date.now();
    try {
      await fetch("/favicon.png", { cache: "no-store" });
      setNote(`✓ ${t("checkConnection")} — ${Date.now() - start}ms`);
    } catch {
      setNote(`✕ ${t("checkConnection")}`);
    }
  };

  return (
    <AppShell title={t("settings")}>
      <div className="space-y-4 pb-6">
        <Group>
          <Row
            icon={User}
            label={t("personalInfo")}
            onClick={() => navigate({ to: "/edit-profile" })}
          />
          <Row
            icon={Building2}
            label={t("businessInfo")}
            onClick={() => navigate({ to: "/company" })}
          />
          <Row
            icon={BadgeCheck}
            label={t("verifiedBadge")}
            onClick={() => navigate({ to: "/upgrade" })}
          />
          <Row
            icon={Phone}
            label={t("phoneNumbers")}
            value="+234 800 000 0000"
            onClick={() => navigate({ to: "/edit-profile" })}
          />
          <Row
            icon={Mail}
            label={t("changeEmail")}
            value="ibrahim@farmx.app"
            onClick={() => navigate({ to: "/edit-profile" })}
          />
        </Group>

        <Group>
          <Row
            icon={Languages}
            label={t("changeLanguage")}
            value={LANGUAGES.find((l) => l.code === lang)?.label}
            onClick={() => setLangOpen(!langOpen)}
          />
          {langOpen && (
            <div className="grid grid-cols-2 gap-2 p-3 bg-accent/30">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLang(l.code as Lang);
                    setLangOpen(false);
                  }}
                  className={`px-3 py-2 text-sm rounded-lg border ${lang === l.code ? "bg-brand text-brand-foreground border-brand" : "bg-background border-border"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
          <Toggle
            icon={Share2}
            label={t("autoAdSharing")}
            on={!!toggles.autoAdSharing}
            set={(v) => setToggle("autoAdSharing", v)}
          />
          <Toggle
            icon={MessageSquareOff}
            label={t("disableChats")}
            on={!!toggles.disableChats}
            set={(v) => setToggle("disableChats", v)}
          />
          <Toggle
            icon={StarOff}
            label={t("disableFeedback")}
            on={!!toggles.disableFeedback}
            set={(v) => setToggle("disableFeedback", v)}
          />
          <Toggle
            icon={PhoneCall}
            label={t("inAppCalls")}
            on={!!toggles.inAppCalls}
            set={(v) => setToggle("inAppCalls", v)}
          />
          <Toggle
            icon={Bell}
            label={t("manageNotifications")}
            on={!!toggles.notifications}
            set={(v) => setToggle("notifications", v)}
          />
          <Toggle
            icon={Moon}
            label={t("darkMode")}
            on={mode === "dark"}
            set={(v) => setMode(v ? "dark" : "light")}
          />
        </Group>

        <Group>
          <Row
            icon={KeyRound}
            label={t("changePassword")}
            onClick={() => setNote(`${t("changePassword")} — AWS Cognito`)}
          />
          <Row
            icon={Info}
            label={t("aboutApp")}
            value="FarmX v1.0"
            onClick={() => setNote("FarmX v1.0")}
          />
          <Row icon={Wifi} label={t("checkConnection")} onClick={ping} />
          <Row
            icon={Star}
            label={t("rateUs")}
            onClick={() => setNote("⭐⭐⭐⭐⭐ " + t("rateUs"))}
          />
        </Group>

        <Group>
          <Row
            icon={Trash2}
            label={t("deleteAccount")}
            danger
            onClick={() => setNote(t("deleteAccount") + " — confirm required")}
          />
          <Row icon={LogOut} label={t("logout")} danger onClick={() => navigate({ to: "/" })} />
        </Group>

        {note && <p className="text-xs text-brand font-semibold text-center">{note}</p>}

        <Link to="/profile" className="block text-center text-xs text-muted-foreground">
          ← {t("profile")}
        </Link>
      </div>
    </AppShell>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border">
      {children}
    </div>
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
      className={`w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-accent ${danger ? "text-brand" : ""}`}
    >
      <Icon className={`h-4 w-4 ${danger ? "" : "text-brand"}`} />
      <span className="text-sm font-medium flex-1">{label}</span>
      {value && (
        <span className="text-[11px] text-muted-foreground truncate max-w-32">{value}</span>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
  set: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <Icon className="h-4 w-4 text-brand" />
      <span className="text-sm font-medium flex-1">{label}</span>
      <button
        onClick={() => set(!on)}
        aria-pressed={on}
        className={`h-6 w-11 rounded-full transition-colors relative ${on ? "bg-brand" : "bg-muted-foreground/30"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-5.5" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}
