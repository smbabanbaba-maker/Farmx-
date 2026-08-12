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

export type MessageKind = "text" | "product" | "delivery" | "coupon" | "system";

export type DeliveryState = "sent" | "delivered" | "seen";

export interface ProductRef {
  id: string;
  name: string;
  price: number;
  image: string;
  seller: string;
}

export interface DeliveryUpdate {
  status: "pending" | "shipped" | "in_transit" | "delivered";
  note?: string;
}

export interface Message {
  id: string;
  from: "me" | "them";
  kind: MessageKind;
  text?: string;
  product?: ProductRef;
  delivery?: DeliveryUpdate;
  coupon?: { code: string; percent: number };
  createdAt: number;
  read: boolean;
  /** Outgoing receipt state (only meaningful for from === "me") */
  status?: DeliveryState;
  deliveredAt?: number;
  seenAt?: number;
  /** Anti-fraud flag on an incoming message */
  flagged?: boolean;
  flagReason?: string;
}

export interface Conversation {
  id: string;
  peer: {
    name: string;
    avatar: string; // emoji or url
    verified: boolean;
    location?: string;
    lastSeen?: string;
  };
  product?: ProductRef;
  productClosed?: boolean;
  spam?: boolean;
  autoSpam?: boolean;
  fraudReasons?: string[];
  messages: Message[];
  updatedAt: number;
}

export type ReportStatus = "submitted" | "under_review" | "action_taken" | "dismissed";

export interface Report {
  id: string;
  conversationId?: string;
  seller: string;
  reason: string;
  details: string;
  status: ReportStatus;
  createdAt: number;
  updatedAt: number;
  reference: string;
}

interface StoreShape {
  conversations: Conversation[];
  reports: Report[];
  typing: Record<string, boolean>;
}

const STORAGE_KEY = "farmx-messages-v2";
const CHANNEL = "farmx-messages-sync";

/* ------------------------------ anti-fraud ------------------------------ */

const FRAUD_RULES: { re: RegExp; reason: string }[] = [
  { re: /\b(advance|upfront|deposit)\s*(payment|fee)?\b/i, reason: "Asks for advance payment" },
  {
    re: /\b(western\s*union|moneygram|bitcoin|btc|usdt|crypto|gift\s*card)\b/i,
    reason: "Untraceable payment method",
  },
  {
    re: /\b(account\s*number|bank\s*details|send\s*money|transfer\s*to)\b/i,
    reason: "Off-platform bank transfer",
  },
  { re: /\b(otp|pin|password|bvn|nin)\b/i, reason: "Requests private credentials" },
  {
    re: /\b(whatsapp|telegram|call\s*me\s*on)\b.*\b(\+?\d[\d\s-]{7,})\b/i,
    reason: "Moves chat off-platform",
  },
  { re: /\b(clearing|customs|delivery)\s*fee\b/i, reason: "Fake clearing/delivery fee" },
  {
    re: /\b(you\s*(have\s*)?won|lottery|double\s*your\s*money|investment\s*returns?)\b/i,
    reason: "Too-good-to-be-true offer",
  },
  { re: /https?:\/\/(bit\.ly|tinyurl|t\.co|cutt\.ly)\S+/i, reason: "Shortened/suspicious link" },
];

export function scanFraud(text: string | undefined): string[] {
  if (!text) return [];
  return FRAUD_RULES.filter((r) => r.re.test(text)).map((r) => r.reason);
}

function sellerReplyFor(text: string, location?: string) {
  const message = text.toLowerCase();
  if (message.includes("last price") || message.includes("offer")) {
    return "The listed price is the best price for now, but you can send your offer and I will consider it.";
  }
  if (message.includes("available")) {
    return "Yes, it is still available. Please let me know the quantity you need.";
  }
  if (message.includes("location")) {
    return `I am available in ${location ?? "the listed location"}. Pickup and delivery can be arranged.`;
  }
  if (message.includes("call")) {
    return "Sure. Please use the request call back button and I will contact you shortly.";
  }
  return "Thanks for your message. I am online and will reply with the details shortly.";
}

/* --------------------------------- seed --------------------------------- */

function seed(): StoreShape {
  const now = Date.now();
  return {
    reports: [],
    typing: {},
    conversations: [
      {
        id: "c_green",
        peer: {
          name: "GreenFields Ltd",
          avatar: "🌾",
          verified: true,
          location: "Kano",
          lastSeen: "online",
        },
        product: {
          id: "1",
          name: "Maize (100kg)",
          price: 45000,
          image: "🌽",
          seller: "GreenFields Ltd",
        },
        updatedAt: now - 1000 * 60 * 12,
        messages: [
          {
            id: "m1",
            from: "them",
            kind: "product",
            product: {
              id: "1",
              name: "Maize (100kg)",
              price: 45000,
              image: "🌽",
              seller: "GreenFields Ltd",
            },
            createdAt: now - 1000 * 60 * 60,
            read: true,
          },
          {
            id: "m2",
            from: "them",
            kind: "text",
            text: "Sannu! Muna da sabo 100kg na masara. Kana buƙata?",
            createdAt: now - 1000 * 60 * 59,
            read: true,
          },
          {
            id: "m3",
            from: "me",
            kind: "text",
            text: "Toh, nawa ne farashi na ƙarshe?",
            createdAt: now - 1000 * 60 * 40,
            read: true,
            status: "seen",
            deliveredAt: now - 1000 * 60 * 40,
            seenAt: now - 1000 * 60 * 39,
          },
          {
            id: "m4",
            from: "them",
            kind: "text",
            text: "₦45,000 kai tsaye. Delivery Kano free.",
            createdAt: now - 1000 * 60 * 12,
            read: false,
          },
        ],
      },
      {
        id: "c_delta",
        peer: {
          name: "Delta Agro",
          avatar: "🌱",
          verified: true,
          location: "Asaba",
          lastSeen: "2h ago",
        },
        product: { id: "3", name: "Rice Paddy", price: 65000, image: "🌾", seller: "Delta Agro" },
        productClosed: true,
        updatedAt: now - 1000 * 60 * 60 * 3,
        messages: [
          {
            id: "d1",
            from: "me",
            kind: "text",
            text: "Hello, is the rice paddy still available?",
            createdAt: now - 1000 * 60 * 60 * 4,
            read: true,
            status: "delivered",
            deliveredAt: now - 1000 * 60 * 60 * 4,
          },
          {
            id: "d2",
            from: "them",
            kind: "delivery",
            delivery: { status: "shipped", note: "Left warehouse. ETA 2 days." },
            createdAt: now - 1000 * 60 * 60 * 3,
            read: false,
          },
        ],
      },
      {
        id: "c_unknown",
        peer: {
          name: "QuickCash Deals",
          avatar: "💸",
          verified: false,
          location: "Unknown",
          lastSeen: "3d ago",
        },
        updatedAt: now - 1000 * 60 * 60 * 26,
        spam: true,
        autoSpam: true,
        fraudReasons: ["Asks for advance payment"],
        messages: [
          {
            id: "s1",
            from: "them",
            kind: "text",
            text: "Send ₦20,000 deposit now to reserve stock.",
            createdAt: now - 1000 * 60 * 60 * 26,
            read: false,
            flagged: true,
            flagReason: "Asks for advance payment",
          },
        ],
      },
    ],
  };
}

/* -------------------------------- context ------------------------------- */

type Ctx = {
  conversations: Conversation[];
  reports: Report[];
  totalUnread: number;
  getConversation: (id: string) => Conversation | undefined;
  openConversationWith: (peer: Conversation["peer"], product?: ProductRef) => string;
  sendText: (id: string, text: string) => void;
  sendProduct: (id: string, product: ProductRef) => void;
  sendCoupon: (id: string, code: string, percent: number) => void;
  sendDelivery: (id: string, update: DeliveryUpdate) => void;
  receiveText: (id: string, text: string) => void;
  isTyping: (id: string) => boolean;
  markRead: (id: string) => void;
  setSpam: (id: string, spam: boolean) => void;
  deleteConversation: (id: string) => void;
  searchMessages: (q: string) => { conversation: Conversation; message: Message }[];
  submitReport: (r: {
    conversationId?: string;
    seller: string;
    reason: string;
    details: string;
  }) => Report;
};

const MessagesCtx = createContext<Ctx | null>(null);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<StoreShape>({ conversations: [], reports: [], typing: {} });
  const storeRef = useRef(store);
  storeRef.current = store;
  const chanRef = useRef<BroadcastChannel | null>(null);

  const read = (): StoreShape | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoreShape;
      return {
        conversations: parsed.conversations ?? [],
        reports: parsed.reports ?? [],
        typing: parsed.typing ?? {},
      };
    } catch {
      return null;
    }
  };

  useEffect(() => {
    setStore(read() ?? seed());

    // Realtime sync between open tabs/windows
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const next = read();
        if (next) setStore(next);
      }
    };
    window.addEventListener("storage", onStorage);

    let chan: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      chan = new BroadcastChannel(CHANNEL);
      chan.onmessage = (ev) => {
        if (ev.data?.type === "sync" && ev.data.store) setStore(ev.data.store as StoreShape);
      };
      chanRef.current = chan;
    }
    return () => {
      window.removeEventListener("storage", onStorage);
      chan?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback((next: StoreShape) => {
    setStore(next);
    storeRef.current = next;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    try {
      chanRef.current?.postMessage({ type: "sync", store: next });
    } catch {
      /* ignore */
    }
  }, []);

  // Receipt ticker: sent -> delivered -> seen (simulated peer activity)
  useEffect(() => {
    const t = setInterval(() => {
      const s = storeRef.current;
      const now = Date.now();
      let changed = false;
      const conversations = s.conversations.map((c) => {
        if (c.spam) return c;
        const messages = c.messages.map((m) => {
          if (m.from !== "me") return m;
          const st = m.status ?? "sent";
          if (st === "sent" && now - m.createdAt > 1500) {
            changed = true;
            return { ...m, status: "delivered" as const, deliveredAt: now };
          }
          if (st === "delivered" && now - m.createdAt > 5000) {
            changed = true;
            return { ...m, status: "seen" as const, seenAt: now };
          }
          return m;
        });
        return changed ? { ...c, messages } : c;
      });
      if (changed) persist({ ...s, conversations });
    }, 1200);
    return () => clearInterval(t);
  }, [persist]);

  const value = useMemo<Ctx>(() => {
    const totalUnread = store.conversations.reduce(
      (sum, c) => sum + c.messages.filter((m) => m.from === "them" && !m.read).length,
      0,
    );

    const append = (id: string, msg: Omit<Message, "id" | "createdAt" | "read">) => {
      const now = Date.now();
      const reasons = msg.from === "them" ? scanFraud(msg.text) : [];
      const message: Message = {
        ...msg,
        id: `m_${now}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        read: msg.from === "me",
        status: msg.from === "me" ? "sent" : undefined,
        flagged: reasons.length > 0 || undefined,
        flagReason: reasons[0],
      };
      const conversations = store.conversations.map((c) => {
        if (c.id !== id) return c;
        const messages = [...c.messages, message];
        if (reasons.length > 0) {
          const warn: Message = {
            id: `m_${now}_warn`,
            from: "them",
            kind: "system",
            text: `⚠️ Automatic anti-fraud lock: ${reasons.join(", ")}. This chat was moved to Spam. Never pay in advance.`,
            createdAt: now + 1,
            read: false,
          };
          return {
            ...c,
            messages: [...messages, warn],
            spam: true,
            autoSpam: true,
            fraudReasons: Array.from(new Set([...(c.fraudReasons ?? []), ...reasons])),
            updatedAt: now,
          };
        }
        return { ...c, messages, updatedAt: now };
      });
      persist({ ...store, conversations });
    };

    const scheduleLiveReply = (id: string, text: string) => {
      const current = storeRef.current;
      const conversation = current.conversations.find((item) => item.id === id);
      if (!conversation || conversation.spam || conversation.productClosed) return;

      persist({ ...current, typing: { ...current.typing, [id]: true } });
      window.setTimeout(
        () => {
          const latest = storeRef.current;
          const active = latest.conversations.find((item) => item.id === id);
          if (!active || active.spam) return;
          const now = Date.now();
          const reply: Message = {
            id: `m_${now}_${Math.random().toString(36).slice(2, 7)}`,
            from: "them",
            kind: "text",
            text: sellerReplyFor(text, active.peer.location),
            createdAt: now,
            read: false,
          };
          persist({
            ...latest,
            typing: { ...latest.typing, [id]: false },
            conversations: latest.conversations.map((item) =>
              item.id === id
                ? { ...item, messages: [...item.messages, reply], updatedAt: now }
                : item,
            ),
          });
        },
        900 + Math.floor(Math.random() * 700),
      );
    };

    return {
      conversations: [...store.conversations].sort((a, b) => b.updatedAt - a.updatedAt),
      reports: [...store.reports].sort((a, b) => b.createdAt - a.createdAt),
      totalUnread,
      getConversation: (id) => store.conversations.find((c) => c.id === id),
      openConversationWith: (peer, product) => {
        const existing = store.conversations.find(
          (c) => c.peer.name === peer.name && c.product?.id === product?.id,
        );
        if (existing) return existing.id;
        const id = `c_${Date.now()}`;
        const now = Date.now();
        const initial: Message[] = product
          ? [
              {
                id: `m_${now}`,
                from: "me",
                kind: "product",
                product,
                createdAt: now,
                read: true,
                status: "sent",
              },
            ]
          : [];
        const conv: Conversation = { id, peer, product, messages: initial, updatedAt: now };
        persist({ ...store, conversations: [conv, ...store.conversations] });
        return id;
      },
      sendText: (id, text) => {
        append(id, { from: "me", kind: "text", text });
        scheduleLiveReply(id, text);
      },
      sendProduct: (id, product) => append(id, { from: "me", kind: "product", product }),
      sendCoupon: (id, code, percent) =>
        append(id, { from: "me", kind: "coupon", coupon: { code, percent } }),
      sendDelivery: (id, update) => append(id, { from: "me", kind: "delivery", delivery: update }),
      receiveText: (id, text) => append(id, { from: "them", kind: "text", text }),
      isTyping: (id) => Boolean(store.typing[id]),
      markRead: (id) => {
        const conversations = store.conversations.map((c) =>
          c.id === id ? { ...c, messages: c.messages.map((m) => ({ ...m, read: true })) } : c,
        );
        persist({ ...store, conversations });
      },
      setSpam: (id, spam) => {
        persist({
          ...store,
          conversations: store.conversations.map((c) =>
            c.id === id ? { ...c, spam, autoSpam: spam ? c.autoSpam : false } : c,
          ),
        });
      },
      deleteConversation: (id) => {
        persist({ ...store, conversations: store.conversations.filter((c) => c.id !== id) });
      },
      searchMessages: (q) => {
        const term = q.trim().toLowerCase();
        if (!term) return [];
        const out: { conversation: Conversation; message: Message }[] = [];
        for (const c of store.conversations) {
          for (const m of c.messages) {
            if (
              m.text?.toLowerCase().includes(term) ||
              m.product?.name.toLowerCase().includes(term)
            ) {
              out.push({ conversation: c, message: m });
            }
          }
        }
        return out.sort((a, b) => b.message.createdAt - a.message.createdAt).slice(0, 30);
      },
      submitReport: ({ conversationId, seller, reason, details }) => {
        const now = Date.now();
        const report: Report = {
          id: `r_${now}`,
          conversationId,
          seller,
          reason,
          details,
          status: "submitted",
          createdAt: now,
          updatedAt: now,
          reference: `FX-${now.toString(36).toUpperCase().slice(-6)}`,
        };
        persist({ ...store, reports: [report, ...store.reports] });
        return report;
      },
    };
  }, [store, persist]);

  return <MessagesCtx.Provider value={value}>{children}</MessagesCtx.Provider>;
}

export function useMessages() {
  const ctx = useContext(MessagesCtx);
  if (!ctx) throw new Error("useMessages must be used inside MessagesProvider");
  return ctx;
}

export const REPORT_REASONS = [
  "Scam or fraud",
  "Asked for advance payment",
  "Fake or misleading ad",
  "Abusive language",
  "Counterfeit goods",
  "Spam / repeated messages",
  "Other",
] as const;

export function reportStatusLabel(s: ReportStatus) {
  return s === "submitted"
    ? "Submitted"
    : s === "under_review"
      ? "Under review"
      : s === "action_taken"
        ? "Action taken"
        : "Dismissed";
}
