import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  useNotifications,
  NOTIF_CHANNELS,
  type AppNotification,
  type NotificationCategory,
} from "@/lib/notifications-store";
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  BellRing,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  ExternalLink,
  Flag,
  Heart,
  Info,
  Loader2,
  Megaphone,
  MessageCircle,
  MoreHorizontal,
  RefreshCw,
  Rocket,
  Settings2,
  Shield,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — FarmX" },
      {
        name: "description",
        content:
          "Real FarmX messages, listing activity, account, community and service notifications.",
      },
      { property: "og:title", content: "FarmX Notifications" },
      { property: "og:description", content: "Stay up to date with your FarmX activity." },
    ],
  }),
  component: NotificationsPage,
});

type Filter = "all" | "unread" | "messages" | "marketplace" | "account";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "messages", label: "Messages" },
  { key: "marketplace", label: "Marketplace" },
  { key: "account", label: "Account" },
];

const ICONS: Record<string, typeof Bell> = {
  messages: MessageCircle,
  message: MessageCircle,
  listings: CheckCircle2,
  listing_activity: Bookmark,
  followers: UserPlus,
  promotions: Rocket,
  promo: Rocket,
  community: Users,
  account: BadgeCheck,
  security: Shield,
  system: Info,
  order: CheckCircle2,
  escrow: Shield,
  dispute: AlertTriangle,
  kyc: BadgeCheck,
  billing: CreditCard,
};

const LABELS: Record<string, string> = {
  messages: "Messages",
  message: "Messages",
  listings: "Listings",
  listing_activity: "Listing activity",
  followers: "Followers",
  promotions: "Promotions",
  promo: "Promotions",
  community: "Community",
  account: "Account",
  security: "Security",
  system: "FarmX",
  order: "Listing updates",
  escrow: "FarmX services",
  dispute: "Account",
  kyc: "Account",
  billing: "FarmX services",
};

function NotificationsPage() {
  const navigate = useNavigate();
  const {
    items,
    unread,
    loading,
    error,
    channels,
    pushEnabled,
    pushSupported,
    permission,
    enablePush,
    disablePush,
    setChannel,
    markRead,
    markAllRead,
    archive,
    retry,
  } = useNotifications();
  const [filter, setFilter] = useState<Filter>("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const visible = useMemo(
    () =>
      items.filter((item) => {
        if (filter === "unread") return !item.read;
        if (filter === "messages")
          return item.category === "messages" || item.category === "message";
        if (filter === "marketplace")
          return [
            "listings",
            "listing_activity",
            "followers",
            "promotions",
            "promo",
            "order",
            "escrow",
          ].includes(item.category);
        if (filter === "account")
          return ["account", "security", "kyc", "billing", "dispute"].includes(item.category);
        return true;
      }),
    [filter, items],
  );

  const groups = useMemo(() => groupNotifications(visible), [visible]);

  const openNotification = (notification: AppNotification) => {
    markRead(notification.id);
    const target =
      notification.targetUrl ??
      notification.link ??
      (notification.conversationId
        ? `/messages/${notification.conversationId}`
        : notification.listing?.id
          ? `/product/${notification.listing.id}`
          : undefined);
    if (target) navigate({ to: target as never });
  };

  return (
    <AppShell title="Notifications">
      <div className="mx-auto max-w-2xl space-y-4 pb-10">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">
              FarmX activity
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">Notifications</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Important updates from your FarmX account and marketplace activity.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSettingsOpen((open) => !open)}
              className="rounded-xl p-2.5 text-muted-foreground transition hover:bg-accent hover:text-brand"
              aria-label="Notification settings"
              title="Notification settings"
            >
              <Settings2 className="h-5 w-5" />
            </button>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="hidden rounded-xl border border-brand/20 bg-brand/5 px-3 py-2 text-[11px] font-black text-brand transition hover:bg-brand/10 sm:inline-flex"
              >
                <Check className="mr-1.5 h-3.5 w-3.5" /> Mark all as read
              </button>
            )}
          </div>
        </header>

        {settingsOpen && (
          <NotificationSettings
            pushEnabled={pushEnabled}
            pushSupported={pushSupported}
            permission={permission}
            channels={channels}
            onPush={() => {
              if (pushEnabled) disablePush();
              else void enablePush();
            }}
            onChannel={setChannel}
          />
        )}

        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map(({ key, label }) => {
            const count = key === "unread" ? unread : key === "all" ? items.length : undefined;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-black transition ${filter === key ? "border-brand bg-brand text-brand-foreground" : "border-border bg-card text-muted-foreground hover:border-brand/40 hover:text-brand"}`}
              >
                {label}
                {typeof count === "number" && count > 0 && (
                  <span className="ml-1.5 opacity-80">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] font-semibold text-muted-foreground">
            {unread > 0
              ? `${unread} unread notification${unread === 1 ? "" : "s"}`
              : "You’re all caught up"}
          </p>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => setClearOpen(true)}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" /> Clear non-security
            </button>
          )}
        </div>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState onRetry={() => void retry()} />
        ) : groups.length === 0 ? (
          <EmptyState hasFilter={filter !== "all"} onBrowse={() => navigate({ to: "/market" })} />
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.label}>
                <h2 className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  {group.label}
                </h2>
                <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                  {group.items.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onOpen={() => openNotification(notification)}
                      onArchive={() => archive(notification.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2 rounded-2xl border border-brand/15 bg-brand/[0.04] p-3">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Notifications show activity that belongs to your FarmX account. Private phone numbers,
            payment details, and conversations are never exposed here.
          </p>
        </div>
      </div>
      {clearOpen && (
        <ConfirmClear
          onCancel={() => setClearOpen(false)}
          onConfirm={() => {
            items.forEach((item) => archive(item.id));
            setClearOpen(false);
          }}
        />
      )}
    </AppShell>
  );
}

function NotificationSettings({
  pushEnabled,
  pushSupported,
  permission,
  channels,
  onPush,
  onChannel,
}: {
  pushEnabled: boolean;
  pushSupported: boolean;
  permission: NotificationPermission | "unsupported";
  channels: Record<string, boolean>;
  onPush: () => void;
  onChannel: (key: NotificationCategory | string, value: boolean) => void;
}) {
  const primary = NOTIF_CHANNELS.filter((channel) => channel.group !== "Legacy");
  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <BellRing className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">Notification settings</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            In-app notifications remain available even when browser push is off.
          </p>
        </div>
        <button
          type="button"
          onClick={onPush}
          disabled={!pushSupported || permission === "denied"}
          className={`rounded-xl px-3 py-2 text-[11px] font-black disabled:opacity-50 ${pushEnabled ? "bg-brand text-brand-foreground" : "border border-border"}`}
        >
          {pushEnabled ? "Push on" : "Enable push"}
        </button>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {primary.map((channel) => (
          <label
            key={channel.key}
            className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-xs font-bold"
          >
            <span>{channel.label}</span>
            <input
              type="checkbox"
              checked={channels[channel.key] !== false}
              onChange={(event) => onChannel(channel.key, event.target.checked)}
              className="h-4 w-4 accent-[hsl(var(--brand,0_84%_50%))]"
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function NotificationCard({
  notification,
  onOpen,
  onArchive,
}: {
  notification: AppNotification;
  onOpen: () => void;
  onArchive: () => void;
}) {
  const Icon = ICONS[notification.category] ?? Bell;
  return (
    <div
      className={`group relative flex gap-3 border-b border-border p-4 last:border-b-0 transition hover:bg-brand/[0.03] ${notification.read ? "bg-card" : "bg-brand/[0.045]"}`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        <Avatar notification={notification} icon={Icon} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className={`truncate text-sm ${notification.read ? "font-bold" : "font-black"}`}>
                  {notification.title}
                </p>
                {notification.priority === "security" && (
                  <span className="shrink-0 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-black text-destructive">
                    Security
                  </span>
                )}
              </div>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {LABELS[notification.category] ?? "FarmX"}
              </p>
            </div>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {relativeTime(notification.at)}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{notification.body}</p>
          {notification.actor && (
            <p className="mt-2 text-[10px] font-semibold text-brand">
              From {notification.actor.name}
            </p>
          )}
          {notification.listing && (
            <span className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-background p-2">
              <ListingThumb image={notification.listing.image} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-black">
                  {notification.listing.title}
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  {notification.listing.location ?? "FarmX listing"}
                  {notification.listing.price != null
                    ? ` · ₦${notification.listing.price.toLocaleString()}`
                    : ""}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-brand" />
            </span>
          )}
        </div>
        {!notification.read && (
          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" aria-label="Unread" />
        )}
      </button>
      <button
        type="button"
        onClick={onArchive}
        className="absolute right-2 top-2 rounded-lg p-1.5 text-muted-foreground opacity-0 transition hover:bg-accent hover:text-destructive group-hover:opacity-100 focus:opacity-100"
        aria-label="Dismiss notification"
        title="Dismiss"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
}

function Avatar({
  notification,
  icon: Icon,
}: {
  notification: AppNotification;
  icon: typeof Bell;
}) {
  if (notification.actor?.avatar?.startsWith("http"))
    return (
      <img
        src={notification.actor.avatar}
        alt=""
        className="h-10 w-10 shrink-0 rounded-2xl border border-border object-cover"
      />
    );
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
      <Icon className="h-5 w-5" />
    </div>
  );
}
function ListingThumb({ image }: { image?: string }) {
  return image?.startsWith("http") ? (
    <img src={image} alt="" className="h-9 w-12 rounded-lg object-cover" />
  ) : (
    <div className="flex h-9 w-12 items-center justify-center rounded-lg bg-brand/10 text-lg">
      {image || <Bookmark className="h-4 w-4 text-brand" />}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card">
      {[1, 2, 3].map((item) => (
        <div key={item} className="flex gap-3 border-b border-border p-4 last:border-0">
          <div className="h-10 w-10 animate-pulse rounded-2xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-2 w-1/4 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-3xl border border-destructive/20 bg-destructive/5 px-6 py-14 text-center">
      <XCircle className="mx-auto h-8 w-8 text-destructive" />
      <p className="mt-3 text-sm font-black">Unable to load notifications.</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Please check your connection and try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-black text-brand-foreground"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Retry
      </button>
    </div>
  );
}
function EmptyState({ hasFilter, onBrowse }: { hasFilter: boolean; onBrowse: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <Sparkles className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-base font-black">
        {hasFilter ? "No notifications in this view" : "You’re all caught up"}
      </h2>
      <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
        {hasFilter ? "Try another filter to see more activity." : "No new notifications right now."}
      </p>
      {!hasFilter && (
        <button
          type="button"
          onClick={onBrowse}
          className="mt-5 rounded-xl bg-brand px-4 py-2.5 text-xs font-black text-brand-foreground"
        >
          Browse Market
        </button>
      )}
    </div>
  );
}
function ConfirmClear({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 sm:items-center">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted">
          <Trash2 className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-base font-black">Clear notifications?</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Non-security notifications will be archived. Important security alerts stay available.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border py-3 text-xs font-black"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-foreground py-3 text-xs font-black text-background"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

function groupNotifications(items: AppNotification[]) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const groups: { label: string; items: AppNotification[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Earlier", items: [] },
  ];
  items.forEach((item) => {
    const date = new Date(item.at);
    if (date.toDateString() === today.toDateString()) groups[0].items.push(item);
    else if (date.toDateString() === yesterday.toDateString()) groups[1].items.push(item);
    else groups[2].items.push(item);
  });
  return groups.filter((group) => group.items.length > 0);
}
function relativeTime(timestamp: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
