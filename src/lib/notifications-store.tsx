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

export type NotifType = "order" | "escrow" | "promo" | "message" | "dispute" | "kyc" | "billing";

export interface AppNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  at: number;
  read: boolean;
  link?: string;
}

const KEY = "farmx-notifications-v1";
const MAX = 80;

export const NOTIF_CHANNELS: { key: NotifType; label: string }[] = [
  { key: "order", label: "Order updates" },
  { key: "escrow", label: "Escrow status" },
  { key: "promo", label: "Promo expiry" },
  { key: "message", label: "New messages" },
  { key: "dispute", label: "Disputes" },
  { key: "kyc", label: "Verification" },
  { key: "billing", label: "Billing & installments" },
];

interface State {
  items: AppNotification[];
  channels: Record<string, boolean>;
  pushEnabled: boolean;
}

const initial: State = {
  items: [],
  channels: {
    order: true,
    escrow: true,
    promo: true,
    message: true,
    dispute: true,
    kyc: true,
    billing: true,
  },
  pushEnabled: false,
};

type Ctx = {
  items: AppNotification[];
  unread: number;
  channels: Record<string, boolean>;
  pushEnabled: boolean;
  pushSupported: boolean;
  permission: NotificationPermission | "unsupported";
  enablePush: () => Promise<boolean>;
  disablePush: () => void;
  setChannel: (k: string, v: boolean) => void;
  notify: (n: Omit<AppNotification, "id" | "at" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
};

const Ctx0 = createContext<Ctx | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState((s) => ({ ...s, ...JSON.parse(raw) }));
    } catch {
      /* ignore */
    }
    if (typeof window === "undefined" || !("Notification" in window)) setPermission("unsupported");
    else setPermission(Notification.permission);
  }, []);

  const persist = useCallback((next: State) => {
    setState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const notify = useCallback(
    (n: Omit<AppNotification, "id" | "at" | "read">) => {
      const s = stateRef.current;
      if (s.channels[n.type] === false) return;
      const item: AppNotification = {
        ...n,
        id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        at: Date.now(),
        read: false,
      };
      const next = { ...s, items: [item, ...s.items].slice(0, MAX) };
      stateRef.current = next;
      persist(next);
      if (
        s.pushEnabled &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification(n.title, { body: n.body, icon: "/farmx-logo.png", tag: item.id });
        } catch {
          /* ignore */
        }
      }
    },
    [persist],
  );

  const value = useMemo<Ctx>(
    () => ({
      items: state.items,
      unread: state.items.filter((i) => !i.read).length,
      channels: state.channels,
      pushEnabled: state.pushEnabled,
      pushSupported: permission !== "unsupported",
      permission,
      enablePush: async () => {
        if (typeof window === "undefined" || !("Notification" in window)) return false;
        const p = await Notification.requestPermission();
        setPermission(p);
        const ok = p === "granted";
        persist({ ...stateRef.current, pushEnabled: ok });
        return ok;
      },
      disablePush: () => persist({ ...stateRef.current, pushEnabled: false }),
      setChannel: (k, v) =>
        persist({ ...stateRef.current, channels: { ...stateRef.current.channels, [k]: v } }),
      notify,
      markRead: (id) =>
        persist({
          ...stateRef.current,
          items: stateRef.current.items.map((i) => (i.id === id ? { ...i, read: true } : i)),
        }),
      markAllRead: () =>
        persist({
          ...stateRef.current,
          items: stateRef.current.items.map((i) => ({ ...i, read: true })),
        }),
      clearAll: () => persist({ ...stateRef.current, items: [] }),
    }),
    [state, permission, persist, notify],
  );

  return <Ctx0.Provider value={value}>{children}</Ctx0.Provider>;
}

export function useNotifications() {
  const ctx = useContext(Ctx0);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
}
