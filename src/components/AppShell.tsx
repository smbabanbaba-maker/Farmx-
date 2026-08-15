import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Home,
  ShoppingBag,
  Briefcase,
  Plus,
  MessageSquare,
  Users,
  User,
  Menu,
  X,
  Sun,
  Moon,
  Languages,
  Type,
} from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { useI18n, LANGUAGES, type Lang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useMessages } from "@/lib/messages-store";
import { useNotifications } from "@/lib/notifications-store";
import { getCurrentSession, signOut } from "@/lib/auth";

const LOGO = "/farmx-logo.png";

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { totalUnread } = useMessages();
  const { unread: unreadNotifications } = useNotifications();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let active = true;
    void getCurrentSession().then((session) => {
      if (active) setIsLoggedIn(Boolean(session));
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  const tabs = [
    { to: "/", icon: Home, label: t("home"), badge: 0 },
    { to: "/market", icon: ShoppingBag, label: t("market"), badge: 0 },
    { to: "/messages", icon: MessageSquare, label: t("chats"), badge: totalUnread },
    { to: "/post-product", icon: Plus, label: t("post"), badge: 0 },
    { to: "/jobs", icon: Briefcase, label: t("jobs"), badge: 0 },
    { to: "/community", icon: Users, label: t("community"), badge: 0 },
    { to: "/profile", icon: User, label: t("profile"), badge: 0 },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-2xl flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src={LOGO} alt="FarmX" className="h-9 w-9 rounded-full object-cover" />
            <span className="font-black text-lg tracking-tight">
              Farm<span className="text-brand">X</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to="/notifications"
              className="relative p-2 rounded-full hover:bg-accent"
              aria-label={
                unreadNotifications > 0
                  ? `${unreadNotifications} ${t("notifications")}`
                  : t("notifications")
              }
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-brand text-brand-foreground text-[9px] font-bold flex items-center justify-center">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </Link>
            <div className="flex items-center gap-1.5">
              {!isLoggedIn && (
                <>
                  <Link
                    to="/login"
                    className="rounded-lg border border-brand px-2.5 py-1 text-xs font-bold text-brand hover:bg-brand/5"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="rounded-lg bg-brand px-2.5 py-1 text-xs font-bold text-brand-foreground shadow-sm"
                  >
                    Sign Up
                  </Link>
                </>
              )}
              <button
                onClick={() => setMenuOpen(true)}
                className="p-2 rounded-full hover:bg-accent"
                aria-label={t("menu")}
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        {title && (
          <div className="mx-auto max-w-2xl px-4 pb-3">
            <h1 className="text-2xl font-bold">{title}</h1>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur border-t border-border">
        <div className="mx-auto max-w-2xl grid grid-cols-7">
          {tabs.map((tab) => {
            const active = tab.to === "/" ? pathname === "/" : pathname.startsWith(tab.to);
            const Icon = tab.icon;
            if (tab.to === "/post-product") {
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  aria-label={t("postNewAd")}
                  className="relative flex min-w-0 min-h-14 flex-col items-center justify-center px-0.5 py-1.5"
                >
                  <span className="h-11 w-11 -mt-4 rounded-full bg-brand text-brand-foreground flex items-center justify-center shadow-lg border-4 border-background">
                    <Plus className="h-6 w-6 stroke-[3]" />
                  </span>
                  <span
                    className={`max-w-full truncate text-[9px] font-medium ${active ? "text-brand" : "text-muted-foreground"}`}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            }
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`relative flex min-w-0 min-h-14 flex-col items-center justify-center gap-0.5 px-0.5 py-2 text-[9px] font-medium ${active ? "text-brand" : "text-muted-foreground"}`}
              >
                <div className="relative">
                  <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                  {tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-brand text-brand-foreground text-[9px] font-bold flex items-center justify-center">
                      {tab.badge > 9 ? "9+" : tab.badge}
                    </span>
                  )}
                </div>
                <span className="truncate max-w-full">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {menuOpen && <SettingsDrawer isLoggedIn={isLoggedIn} onClose={() => setMenuOpen(false)} />}
    </div>
  );
}

function SettingsDrawer({ isLoggedIn, onClose }: { isLoggedIn: boolean; onClose: () => void }) {
  const { t, lang, setLang } = useI18n();
  const { mode, setMode, fontScale, setFontScale } = useTheme();

  const logOut = () => {
    signOut();
    window.location.assign("/");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div
        className="absolute right-0 top-0 h-full w-80 max-w-full bg-card border-l border-border p-5 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">{t("settings")}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <section className="mb-6">
          <label className="flex items-center gap-2 text-sm font-semibold mb-2">
            <Languages className="h-4 w-4" /> {t("language")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code as Lang)}
                className={`px-3 py-2 text-sm rounded-lg border ${lang === l.code ? "bg-brand text-brand-foreground border-brand" : "bg-background border-border hover:bg-accent"}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <label className="flex items-center gap-2 text-sm font-semibold mb-2">
            {mode === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}{" "}
            {t("theme")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode("light")}
              className={`px-3 py-2 text-sm rounded-lg border ${mode === "light" ? "bg-brand text-brand-foreground border-brand" : "bg-background border-border"}`}
            >
              {t("light")}
            </button>
            <button
              onClick={() => setMode("dark")}
              className={`px-3 py-2 text-sm rounded-lg border ${mode === "dark" ? "bg-brand text-brand-foreground border-brand" : "bg-background border-border"}`}
            >
              {t("dark")}
            </button>
          </div>
        </section>

        <section className="mb-6">
          <label className="flex items-center gap-2 text-sm font-semibold mb-2">
            <Type className="h-4 w-4" /> {t("fontSize")} · {Math.round(fontScale * 100)}%
          </label>
          <input
            type="range"
            min="0.85"
            max="1.3"
            step="0.05"
            value={fontScale}
            onChange={(e) => setFontScale(parseFloat(e.target.value))}
            className="w-full accent-[oklch(0.55_0.22_27)]"
          />
        </section>

        {!isLoggedIn ? (
          <div className="mb-4 grid grid-cols-2 gap-2">
            <Link
              to="/login"
              onClick={onClose}
              className="flex items-center justify-center rounded-lg border border-brand py-2.5 text-sm font-bold text-brand"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              onClick={onClose}
              className="flex items-center justify-center rounded-lg bg-brand py-2.5 text-sm font-bold text-brand-foreground"
            >
              Sign Up
            </Link>
          </div>
        ) : (
          <button
            onClick={logOut}
            className="mb-4 w-full rounded-lg bg-brand py-2.5 font-semibold text-brand-foreground"
          >
            {t("logout")}
          </button>
        )}

        <Link
          to="/settings"
          onClick={onClose}
          className="mb-2 flex w-full items-center justify-center rounded-lg border border-border py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
        >
          {t("openFullSettings")}
        </Link>

        <div className="mt-8 flex flex-col items-center gap-1 pb-4">
          <img src={LOGO} alt="" className="h-8 w-8 rounded-full object-cover opacity-80" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            FarmX Marketplace
          </p>
        </div>
      </div>
    </div>
  );
}
