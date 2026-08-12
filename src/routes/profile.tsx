import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useSubscription, FREE_QUOTA } from "@/lib/subscription";
import { usePrefs } from "@/lib/prefs";
import { useMessages } from "@/lib/messages-store";
import { transactions } from "@/lib/mock-data";
import {
  BadgeCheck,
  Megaphone,
  TrendingUp,
  Users,
  Crown,
  Star,
  CreditCard,
  BarChart3,
  LifeBuoy,
  Bell,
  HelpCircle,
  UserPlus,
  Heart,
  Settings,
  ChevronRight,
  Pencil,
  PackageCheck,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — FarmX" },
      {
        name: "description",
        content:
          "Manage your FarmX ads, clients, premium services, feedback, balance, performance and notifications.",
      },
      { property: "og:title", content: "FarmX Profile" },
      {
        property: "og:description",
        content: "Your ads, clients, balance and performance in one place.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t } = useI18n();
  const { tier, listingsLeft } = useSubscription();
  const { saved, followed } = usePrefs();
  const { totalUnread } = useMessages();

  const menu = [
    { to: "/market", icon: Megaphone, label: t("myAds"), meta: "12" },
    { to: "/analytics", icon: TrendingUp, label: t("proSales"), meta: "" },
    { to: "/messages", icon: Users, label: t("myClients"), meta: "" },
    { to: "/subscribe", icon: Crown, label: t("premiumServices"), meta: tier?.name ?? t("free") },
    { to: "/community", icon: Star, label: t("feedback"), meta: "4.8" },
    { to: "/wallet", icon: CreditCard, label: "Payment history", meta: "" },
    { to: "/analytics", icon: BarChart3, label: t("performance"), meta: "" },
    { to: "/messages", icon: LifeBuoy, label: t("requestHelp"), meta: "" },
    {
      to: "/notifications",
      icon: Bell,
      label: t("notifications"),
      meta: totalUnread ? String(totalUnread) : "",
    },
    { to: "/faq", icon: HelpCircle, label: t("faq"), meta: "" },
    {
      to: "/community",
      icon: UserPlus,
      label: t("followers"),
      meta: String(348 + followed.length),
    },
    { to: "/saved", icon: Heart, label: t("savedAds"), meta: String(saved.length) },
    { to: "/orders", icon: PackageCheck, label: t("orders"), meta: "" },
    { to: "/disputes", icon: AlertTriangle, label: t("disputes"), meta: "" },
    { to: "/verify", icon: ShieldCheck, label: t("sellerVerification"), meta: "" },
  ] as const;

  return (
    <AppShell>
      <div className="space-y-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 rounded-full bg-brand text-brand-foreground flex items-center justify-center font-bold text-2xl">
            IB
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h1 className="font-bold text-lg truncate">Ibrahim Bello</h1>
              <BadgeCheck className="h-4 w-4 text-brand shrink-0" />
            </div>
            <p className="text-xs text-muted-foreground">Lagos, Nigeria · Marketplace member</p>
            <p className="text-xs text-brand truncate">Verified FarmX seller profile</p>
          </div>
          <Link
            to="/edit-profile"
            className="p-2 rounded-full hover:bg-accent"
            aria-label={t("editProfile")}
          >
            <Pencil className="h-4 w-4" />
          </Link>
        </div>

        <Link
          to="/subscribe"
          className="block rounded-2xl p-4 bg-gradient-to-br from-black to-brand text-white"
        >
          <p className="text-[10px] uppercase tracking-wide text-white/70">{t("currentPlan")}</p>
          <p className="text-lg font-bold mt-0.5">
            {tier ? tier.name : `${t("freeQuota")} · ${FREE_QUOTA}`}
          </p>
          <p className="text-xs text-white/80 mt-0.5">{`${listingsLeft} ${t("quotaLeft")}`}</p>
        </Link>

        {/* Sidebar + content */}
        <div className="flex gap-3 items-start">
          <nav className="w-44 shrink-0 rounded-2xl bg-card border border-border overflow-hidden">
            {menu.map((m) => (
              <Link
                key={m.label}
                to={m.to}
                className="flex items-center gap-2 px-3 py-3 text-xs font-medium border-b border-border last:border-0 hover:bg-accent"
              >
                <m.icon className="h-4 w-4 text-brand shrink-0" />
                <span className="truncate flex-1">{m.label}</span>
                {m.meta && <span className="text-[10px] text-muted-foreground">{m.meta}</span>}
              </Link>
            ))}
            <Link
              to="/settings"
              className="flex items-center gap-2 px-3 py-3 text-xs font-bold bg-brand/10 text-brand hover:bg-brand/20"
            >
              <Settings className="h-4 w-4" /> {t("settings")}
              <ChevronRight className="h-3 w-3 ml-auto" />
            </Link>
          </nav>

          <div className="flex-1 min-w-0 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { l: t("myAds"), v: "12" },
                { l: t("followers"), v: "348" },
                { l: "★", v: "4.8" },
              ].map((s) => (
                <div key={s.l} className="p-2.5 rounded-xl bg-card border border-border">
                  <p className="font-bold">{s.v}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{s.l}</p>
                </div>
              ))}
            </div>

            <section>
              <h2 className="font-bold text-sm mb-2">{t("performance")}</h2>
              <div className="space-y-2">
                {transactions.slice(0, 4).map((tx) => (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-xl bg-card border border-border flex justify-between text-xs gap-2"
                  >
                    <span className="truncate">{tx.label}</span>
                    <span
                      className={
                        tx.amount > 0
                          ? "text-green-600 dark:text-green-400 shrink-0"
                          : "text-brand shrink-0"
                      }
                    >
                      {tx.amount > 0 ? "+" : ""}₦{Math.abs(tx.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
