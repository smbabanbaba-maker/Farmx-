import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useNotifications, NOTIF_CHANNELS } from "@/lib/notifications-store";
import { notifications as seed } from "@/lib/mock-data";
import {
  Bell,
  BellRing,
  Check,
  Trash2,
  ShieldCheck,
  Package,
  Megaphone,
  MessageSquare,
  AlertTriangle,
  BadgeCheck,
  CreditCard,
} from "lucide-react";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — FarmX" },
      {
        name: "description",
        content:
          "Push alerts for FarmX order updates, escrow status changes, promo expiry reminders and new chat messages.",
      },
      { property: "og:title", content: "FarmX Notifications" },
      { property: "og:description", content: "Order, escrow, promo and message alerts." },
    ],
  }),
  component: NotificationsPage,
});

const ICONS = {
  order: Package,
  escrow: ShieldCheck,
  promo: Megaphone,
  message: MessageSquare,
  dispute: AlertTriangle,
  kyc: BadgeCheck,
  billing: CreditCard,
} as const;

function NotificationsPage() {
  const { t } = useI18n();
  const {
    items,
    unread,
    channels,
    setChannel,
    pushEnabled,
    pushSupported,
    permission,
    enablePush,
    disablePush,
    markRead,
    markAllRead,
    clearAll,
  } = useNotifications();

  return (
    <AppShell title={t("notifications")}>
      <div className="space-y-4 pb-6">
        {/* Push toggle */}
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-brand/10 flex items-center justify-center">
              <BellRing className="h-4 w-4 text-brand" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{t("pushNotifications")}</p>
              <p className="text-[11px] text-muted-foreground">
                {!pushSupported
                  ? t("pushUnsupported")
                  : permission === "denied"
                    ? t("pushBlocked")
                    : t("pushDesc")}
              </p>
            </div>
            <button
              disabled={!pushSupported || permission === "denied"}
              onClick={() => (pushEnabled ? disablePush() : enablePush())}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 ${pushEnabled ? "bg-brand text-brand-foreground" : "border border-border"}`}
            >
              {pushEnabled ? t("on") : t("enable")}
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {NOTIF_CHANNELS.map((c) => (
              <label key={c.key} className="flex items-center justify-between text-xs">
                <span>
                  {t(`notif_${c.key}`) === `notif_${c.key}` ? c.label : t(`notif_${c.key}`)}
                </span>
                <input
                  type="checkbox"
                  checked={channels[c.key] !== false}
                  onChange={(e) => setChannel(c.key, e.target.checked)}
                  className="accent-[hsl(var(--brand,0_84%_50%))] h-4 w-4"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            {unread} {t("unread")}
          </p>
          <div className="flex gap-2">
            <button onClick={markAllRead} className="text-xs font-semibold flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> {t("markAllRead")}
            </button>
            <button
              onClick={clearAll}
              className="text-xs font-semibold text-brand flex items-center gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> {t("clear")}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {items.map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            return (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`w-full text-left p-3 rounded-xl border flex gap-3 ${!n.read ? "bg-brand/5 border-brand/30" : "bg-card border-border"}`}
              >
                <div className="h-9 w-9 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {new Date(n.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </button>
            );
          })}

          {items.length === 0 &&
            seed.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-xl border flex gap-3 ${n.unread ? "bg-brand/5 border-brand/30" : "bg-card border-border"}`}
              >
                <div className="h-9 w-9 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                  <Bell className="h-4 w-4 text-brand" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                </div>
                <span className="text-[11px] text-muted-foreground">{n.time}</span>
              </div>
            ))}
        </div>
      </div>
    </AppShell>
  );
}
