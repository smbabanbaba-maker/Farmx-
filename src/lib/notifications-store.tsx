import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getCommunityNotifications,
  markCommunityNotificationRead,
} from "@/lib/community.functions";
import {
  getMyNotifications,
  markMyNotificationRead,
  syncMyNotifications,
} from "@/lib/notifications.functions";

export type NotificationCategory =
  | "messages"
  | "listings"
  | "listing_activity"
  | "followers"
  | "promotions"
  | "community"
  | "account"
  | "security"
  | "system"
  | "order"
  | "escrow"
  | "promo"
  | "message"
  | "dispute"
  | "kyc"
  | "billing";

export type NotificationPriority = "normal" | "important" | "security";

export interface AppNotification {
  id: string;
  eventId?: string;
  category: NotificationCategory;
  /** Kept as `type` for backwards compatibility with existing integrations. */
  type: NotificationCategory;
  title: string;
  body: string;
  at: number;
  read: boolean;
  readAt?: number;
  archived?: boolean;
  priority?: NotificationPriority;
  actor?: { id?: string; name: string; avatar?: string; username?: string };
  listing?: { id: string; title: string; price?: number | null; image?: string; location?: string };
  conversationId?: string;
  communityPostId?: string;
  targetUrl?: string;
  link?: string;
}

export type NotificationInput = Omit<
  AppNotification,
  "id" | "at" | "read" | "category" | "type"
> & {
  type: NotificationCategory;
  category?: NotificationCategory;
  /** Idempotency key from the originating domain event. */
  eventId?: string;
};

const KEY = "farmx-notifications-v2";
const LEGACY_KEY = "farmx-notifications-v1";
const CHANNEL = "farmx-notifications-sync-v2";
const MAX = 100;
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");
const USE_SERVER_NOTIFICATION_STORE = !API_BASE && import.meta.env.PROD;

export const NOTIF_CHANNELS: { key: NotificationCategory; label: string; group: string }[] = [
  { key: "messages", label: "Messages", group: "Communication" },
  { key: "listings", label: "Listings", group: "Marketplace" },
  { key: "listing_activity", label: "Listing activity", group: "Marketplace" },
  { key: "followers", label: "Followers", group: "Community" },
  { key: "promotions", label: "Promotions", group: "FarmX services" },
  { key: "community", label: "Community", group: "Community" },
  { key: "account", label: "Account", group: "Account & security" },
  { key: "security", label: "Security", group: "Account & security" },
  { key: "system", label: "FarmX updates", group: "FarmX" },
  // Legacy categories remain supported for existing CommerceProvider events.
  { key: "order", label: "Order updates", group: "Legacy" },
  { key: "escrow", label: "Escrow status", group: "Legacy" },
  { key: "promo", label: "Promo expiry", group: "Legacy" },
  { key: "message", label: "New messages", group: "Legacy" },
  { key: "dispute", label: "Disputes", group: "Legacy" },
  { key: "kyc", label: "Verification", group: "Legacy" },
  { key: "billing", label: "Billing & installments", group: "Legacy" },
];

const DEFAULT_CHANNELS: Record<NotificationCategory, boolean> = Object.fromEntries(
  NOTIF_CHANNELS.map(({ key }) => [key, true]),
) as Record<NotificationCategory, boolean>;

type State = {
  items: AppNotification[];
  channels: Record<string, boolean>;
  pushEnabled: boolean;
  loaded: boolean;
  error: string | null;
};

const emptyState: State = {
  items: [],
  channels: DEFAULT_CHANNELS,
  pushEnabled: false,
  loaded: false,
  error: null,
};

function categoryFor(input: { type?: NotificationCategory; category?: NotificationCategory }) {
  if (input.category) return input.category;
  switch (input.type) {
    case "message":
      return "messages";
    case "promo":
      return "promotions";
    case "kyc":
      return "account";
    case "order":
    case "escrow":
      return "listings";
    case "dispute":
    case "billing":
      return "account";
    default:
      return input.type ?? "system";
  }
}

function normalizeItem(raw: Partial<AppNotification>): AppNotification | null {
  if (!raw.id || !raw.title || !raw.body || !raw.at) return null;
  const category = categoryFor({ type: raw.type, category: raw.category });
  return {
    ...raw,
    id: raw.id,
    type: raw.type ?? category,
    category,
    title: raw.title,
    body: raw.body,
    at: Number(raw.at),
    read: Boolean(raw.read),
    archived: Boolean(raw.archived),
  };
}

function readLocalState(): State | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY) ?? window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<State>;
    const items = Array.isArray(parsed.items)
      ? parsed.items
          .map((item) => normalizeItem(item as Partial<AppNotification>))
          .filter((item): item is AppNotification => Boolean(item))
      : [];
    return {
      items,
      channels: { ...DEFAULT_CHANNELS, ...(parsed.channels ?? {}) },
      pushEnabled: Boolean(parsed.pushEnabled),
      loaded: true,
      error: null,
    };
  } catch {
    return null;
  }
}

function eventKey(input: NotificationInput) {
  return (
    input.eventId ??
    `${input.type}|${input.targetUrl ?? input.link ?? ""}|${input.conversationId ?? ""}|${input.listing?.id ?? ""}|${input.title}|${input.body}`
  );
}

function publicTarget(input: AppNotification) {
  return input.targetUrl ?? input.link;
}

interface NotificationsContext {
  items: AppNotification[];
  unread: number;
  loading: boolean;
  error: string | null;
  channels: Record<string, boolean>;
  pushEnabled: boolean;
  pushSupported: boolean;
  permission: NotificationPermission | "unsupported";
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
  enablePush: () => Promise<boolean>;
  disablePush: () => void;
  setChannel: (key: NotificationCategory | string, value: boolean) => void;
  notify: (notification: NotificationInput) => void;
  createNotification: (notification: NotificationInput) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  archive: (id: string) => void;
  clearAll: () => void;
}

const NotificationsContext = createContext<NotificationsContext | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => readLocalState() ?? emptyState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  const persist = useCallback((next: State) => {
    setState(next);
    stateRef.current = next;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Private/restricted storage should not break notifications.
      }
    }
    try {
      channelRef.current?.postMessage({ type: "sync", state: next });
    } catch {
      // Cross-tab sync is best-effort.
    }
    if (API_BASE && typeof window !== "undefined" && navigator.onLine) {
      void fetch(`${API_BASE}/v1/notifications/sync`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: next.items, channels: next.channels }),
      }).catch(() => {
        // Keep the local state when the external service is unavailable.
      });
    } else if (USE_SERVER_NOTIFICATION_STORE) {
      void syncMyNotifications({
        data: { items: next.items, channels: next.channels },
      }).catch(() => undefined);
    }
  }, []);

  const refresh = useCallback(async () => {
    const local = readLocalState();
    if (local) setState(local);
    if (typeof window === "undefined") {
      setState((current) => ({ ...current, loaded: true, error: null }));
      return;
    }
    try {
      let remote: { items?: Partial<AppNotification>[]; channels?: Record<string, boolean> };
      if (API_BASE) {
        const response = await fetch(`${API_BASE}/v1/notifications?limit=${MAX}`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Notification request failed");
        remote = (await response.json()) as {
          items?: Partial<AppNotification>[];
          channels?: Record<string, boolean>;
        };
      } else if (USE_SERVER_NOTIFICATION_STORE) {
        remote = (await getMyNotifications()) as {
          items?: Partial<AppNotification>[];
          channels?: Record<string, boolean>;
        };
      } else {
        remote = {
          items: (await getCommunityNotifications({
            data: { limit: MAX },
          })) as Partial<AppNotification>[],
        };
      }
      const items = (remote.items ?? [])
        .map(normalizeItem)
        .filter((item): item is AppNotification => Boolean(item));
      setState((current) => ({
        ...current,
        items,
        channels: { ...current.channels, ...(remote.channels ?? {}) },
        loaded: true,
        error: null,
      }));
    } catch {
      setState((current) => ({
        ...current,
        loaded: true,
        error: local ? null : "Unable to load notifications.",
      }));
    }
  }, []);

  useEffect(() => {
    void refresh();
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) setPermission("unsupported");
    else setPermission(Notification.permission);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== KEY && event.key !== LEGACY_KEY) return;
      const next = readLocalState();
      if (next) setState(next);
    };
    window.addEventListener("storage", onStorage);

    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = (event) => {
        if (event.data?.type === "sync" && event.data.state) setState(event.data.state as State);
      };
      channelRef.current = channel;
    }
    const refreshTimer =
      API_BASE || USE_SERVER_NOTIFICATION_STORE
        ? window.setInterval(() => void refresh(), 15000)
        : undefined;
    return () => {
      window.removeEventListener("storage", onStorage);
      if (refreshTimer) window.clearInterval(refreshTimer);
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [refresh]);

  const notify = useCallback(
    (input: NotificationInput) => {
      const current = stateRef.current;
      const category = categoryFor(input);
      if (current.channels[category] === false || current.channels[input.type] === false) return;
      const key = eventKey(input);
      const duplicate = current.items.find((item) => item.eventId === key);
      if (duplicate) return;
      const now = Date.now();
      const item: AppNotification = {
        ...input,
        id: `notification_${now}_${Math.random().toString(36).slice(2, 8)}`,
        eventId: key,
        category,
        type: input.type,
        at: now,
        read: false,
        targetUrl: publicTarget(input as AppNotification),
      };
      const next: State = {
        ...current,
        items: [item, ...current.items].slice(0, MAX),
        loaded: true,
        error: null,
      };
      persist(next);
      if (
        current.pushEnabled &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification(item.title, {
            body: item.body,
            icon: "/farmx-logo.png",
            tag: item.eventId,
          });
        } catch {
          // Browser notifications are best-effort.
        }
      }
    },
    [persist],
  );

  const value = useMemo<NotificationsContext>(
    () => ({
      items: state.items.filter((item) => !item.archived).sort((a, b) => b.at - a.at),
      unread: state.items.filter((item) => !item.archived && !item.read).length,
      loading: !state.loaded,
      error: state.error,
      channels: state.channels,
      pushEnabled: state.pushEnabled,
      pushSupported: permission !== "unsupported",
      permission,
      refresh,
      retry: refresh,
      enablePush: async () => {
        if (typeof window === "undefined" || !("Notification" in window)) return false;
        const result = await Notification.requestPermission();
        setPermission(result);
        const enabled = result === "granted";
        persist({ ...stateRef.current, pushEnabled: enabled });
        return enabled;
      },
      disablePush: () => persist({ ...stateRef.current, pushEnabled: false }),
      setChannel: (key, value) =>
        persist({ ...stateRef.current, channels: { ...stateRef.current.channels, [key]: value } }),
      notify,
      createNotification: notify,
      markRead: (id) => {
        const now = Date.now();
        const item = stateRef.current.items.find((entry) => entry.id === id);
        persist({
          ...stateRef.current,
          items: stateRef.current.items.map((entry) =>
            entry.id === id ? { ...entry, read: true, readAt: now } : entry,
          ),
        });
        if (item && USE_SERVER_NOTIFICATION_STORE)
          void markMyNotificationRead({
            data: { notificationId: item.eventId ?? item.id },
          }).catch(() => undefined);
        if (item && (item.category === "community" || item.category === "followers"))
          void markCommunityNotificationRead({
            data: { notificationId: item.eventId ?? item.id },
          }).catch(() => undefined);
      },
      markAllRead: () => {
        const now = Date.now();
        const unreadServerItems = stateRef.current.items.filter(
          (item) =>
            !item.archived &&
            !item.read &&
            (item.category === "community" || item.category === "followers"),
        );
        persist({
          ...stateRef.current,
          items: stateRef.current.items.map((item) =>
            item.archived ? item : { ...item, read: true, readAt: now },
          ),
        });
        void Promise.all(
          unreadServerItems.map((item) => {
            const notificationId = item.eventId ?? item.id;
            const requests: Promise<unknown>[] = [];
            if (USE_SERVER_NOTIFICATION_STORE)
              requests.push(markMyNotificationRead({ data: { notificationId } }));
            if (item.category === "community" || item.category === "followers")
              requests.push(markCommunityNotificationRead({ data: { notificationId } }));
            return Promise.all(requests).catch(() => undefined);
          }),
        );
      },
      archive: (id) => {
        const item = stateRef.current.items.find((notification) => notification.id === id);
        if (item?.priority === "security") return;
        persist({
          ...stateRef.current,
          items: stateRef.current.items.map((notification) =>
            notification.id === id ? { ...notification, archived: true } : notification,
          ),
        });
      },
      clearAll: () =>
        persist({
          ...stateRef.current,
          items: stateRef.current.items.map((item) =>
            item.priority === "security" ? item : { ...item, archived: true },
          ),
        }),
    }),
    [notify, permission, persist, refresh, state],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error("useNotifications must be used inside NotificationsProvider");
  return context;
}
