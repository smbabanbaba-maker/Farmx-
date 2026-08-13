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

export type MessageKind = "text" | "product" | "image" | "delivery" | "coupon" | "system";
export type DeliveryState = "sending" | "sent" | "delivered" | "seen" | "read" | "failed";

export interface ProductRef {
  id: string;
  name: string;
  price: number;
  image: string;
  seller: string;
  location?: string;
  sellerId?: string;
  sellerUsername?: string;
  closed?: boolean;
}

export interface MediaAttachment {
  url: string;
  name?: string;
  objectKey?: string;
  thumbnailUrl?: string;
  uploading?: boolean;
  error?: string;
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
  image?: MediaAttachment;
  delivery?: DeliveryUpdate;
  coupon?: { code: string; percent: number };
  createdAt: number;
  read: boolean;
  status?: DeliveryState;
  deliveredAt?: number;
  seenAt?: number;
  flagged?: boolean;
  flagReason?: string;
}

export interface ConversationPeer {
  id?: string;
  username?: string;
  name: string;
  avatar: string;
  verified: boolean;
  location?: string;
  lastSeen?: string;
  phone?: string;
  online?: boolean;
  callsEnabled?: boolean;
  messagePermission?: "everyone" | "farmx_members" | "followers";
}

export interface Conversation {
  id: string;
  buyerId?: string;
  sellerId?: string;
  listingId?: string;
  direction?: "buying" | "selling";
  peer: ConversationPeer;
  product?: ProductRef;
  productClosed?: boolean;
  spam?: boolean;
  blocked?: boolean;
  muted?: boolean;
  autoSpam?: boolean;
  fraudReasons?: string[];
  messages: Message[];
  updatedAt: number;
}

export type ReportStatus = "submitted" | "under_review" | "action_taken" | "dismissed";

export interface Report {
  id: string;
  conversationId?: string;
  messageId?: string;
  seller: string;
  reason: string;
  details: string;
  status: ReportStatus;
  createdAt: number;
  updatedAt: number;
  reference: string;
}

type StoreShape = {
  conversations: Conversation[];
  reports: Report[];
  typing: Record<string, boolean>;
};

const STORAGE_KEY = "farmx-messages-v3";
const CHANNEL = "farmx-messages-sync-v3";
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");

/* These rules only flag incoming content that has actually arrived. They never create a reply or a fake conversation. */
const FRAUD_RULES: { re: RegExp; reason: string }[] = [
  { re: /\b(advance|upfront|deposit)\s*(payment|fee)?\b/i, reason: "Asks for advance payment" },
  { re: /\b(western\s*union|moneygram|bitcoin|btc|usdt|crypto|gift\s*card)\b/i, reason: "Untraceable payment method" },
  { re: /\b(account\s*number|bank\s*details|send\s*money|transfer\s*to)\b/i, reason: "Off-platform bank transfer" },
  { re: /\b(otp|pin|password|bvn|nin)\b/i, reason: "Requests private credentials" },
  { re: /\b(clearing|customs|delivery)\s*fee\b/i, reason: "Fake clearing/delivery fee" },
];

export function scanFraud(text: string | undefined): string[] {
  if (!text) return [];
  return FRAUD_RULES.filter((rule) => rule.re.test(text)).map((rule) => rule.reason);
}

function emptyStore(): StoreShape {
  return { conversations: [], reports: [], typing: {} };
}

function readLocalStore(): StoreShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    return {
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
      typing: parsed.typing ?? {},
    };
  } catch {
    return null;
  }
}

function peerKey(peer: ConversationPeer) {
  return peer.id ?? peer.username ?? peer.name.trim().toLowerCase();
}

function canCall(peer: ConversationPeer) {
  return peer.callsEnabled !== false;
}

export type MessageContext = {
  conversations: Conversation[];
  reports: Report[];
  totalUnread: number;
  getConversation: (id: string) => Conversation | undefined;
  openConversationWith: (peer: ConversationPeer, product?: ProductRef) => string;
  sendText: (id: string, text: string) => void;
  sendImage: (id: string, image: MediaAttachment) => void;
  sendProduct: (id: string, product: ProductRef) => void;
  sendCoupon: (id: string, code: string, percent: number) => void;
  sendDelivery: (id: string, update: DeliveryUpdate) => void;
  receiveText: (id: string, text: string) => void;
  receiveImage: (id: string, image: MediaAttachment) => void;
  isTyping: (id: string) => boolean;
  markRead: (id: string) => void;
  setSpam: (id: string, spam: boolean) => void;
  setBlocked: (id: string, blocked: boolean) => void;
  setMuted: (id: string, muted: boolean) => void;
  deleteConversation: (id: string) => void;
  searchMessages: (q: string) => { conversation: Conversation; message: Message }[];
  submitReport: (report: { conversationId?: string; messageId?: string; seller: string; reason: string; details: string }) => Report;
  canCall: (id: string) => boolean;
};

const MessagesCtx = createContext<MessageContext | null>(null);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<StoreShape>(() => readLocalStore() ?? emptyStore());
  const storeRef = useRef(store);
  storeRef.current = store;
  const channelRef = useRef<BroadcastChannel | null>(null);

  const persist = useCallback((next: StoreShape) => {
    setStore(next);
    storeRef.current = next;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage may be unavailable in a private or restricted browser context.
      }
    }
    try {
      channelRef.current?.postMessage({ type: "sync", store: next });
    } catch {
      // BroadcastChannel is best-effort only.
    }
    if (API_BASE && typeof window !== "undefined" && navigator.onLine) {
      void fetch(`${API_BASE}/v1/messages/sync`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversations: next.conversations, reports: next.reports }),
      }).catch(() => {
        // Keep the local copy when the production API is temporarily unavailable.
      });
    }
  }, []);

  const loadRemoteStore = useCallback(async () => {
    if (!API_BASE || typeof window === "undefined") return;
    try {
      const response = await fetch(`${API_BASE}/v1/messages/conversations`, { credentials: "include" });
      if (!response.ok) return;
      const remote = (await response.json()) as Partial<StoreShape>;
      if (Array.isArray(remote.conversations)) {
        persist({ conversations: remote.conversations, reports: remote.reports ?? [], typing: remote.typing ?? {} });
      }
    } catch {
      // The preview/local store remains available when the configured service is offline.
    }
  }, [persist]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = readLocalStore();
      if (next) setStore(next);
    };
    window.addEventListener("storage", onStorage);

    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = (event) => {
        if (event.data?.type === "sync" && event.data.store) {
          setStore(event.data.store as StoreShape);
        }
      };
      channelRef.current = channel;
    }

    void loadRemoteStore();
    const refreshTimer = API_BASE ? window.setInterval(() => void loadRemoteStore(), 15000) : undefined;
    return () => {
      window.removeEventListener("storage", onStorage);
      if (refreshTimer) window.clearInterval(refreshTimer);
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [loadRemoteStore]);

  const append = useCallback((id: string, msg: Omit<Message, "id" | "createdAt" | "read">) => {
    const now = Date.now();
    const reasons = msg.from === "them" ? scanFraud(msg.text) : [];
    const incomingWarning: Message | null = reasons.length
      ? {
          id: `warning_${now}`,
          from: "them",
          kind: "system",
          text: `Safety warning: ${reasons.join(", ")}. Do not pay privately or share OTP, PIN, BVN or NIN.`,
          createdAt: now + 1,
          read: false,
          flagged: true,
          flagReason: reasons[0],
        }
      : null;
    const message: Message = {
      ...msg,
      id: `message_${now}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      read: msg.from === "me",
      status: msg.from === "me" ? "sent" : undefined,
      flagged: reasons.length > 0 || undefined,
      flagReason: reasons[0],
    };
    const current = storeRef.current;
    const conversations = current.conversations.map((conversation) =>
      conversation.id === id
        ? {
            ...conversation,
            messages: incomingWarning ? [...conversation.messages, message, incomingWarning] : [...conversation.messages, message],
            spam: reasons.length ? true : conversation.spam,
            autoSpam: reasons.length ? true : conversation.autoSpam,
            fraudReasons: reasons.length ? Array.from(new Set([...(conversation.fraudReasons ?? []), ...reasons])) : conversation.fraudReasons,
            updatedAt: now,
          }
        : conversation,
    );
    persist({ ...current, conversations });
  }, [persist]);

  const value = useMemo<MessageContext>(() => {
    const totalUnread = store.conversations.reduce(
      (sum, conversation) => sum + conversation.messages.filter((message) => message.from === "them" && !message.read).length,
      0,
    );

    return {
      conversations: [...store.conversations].sort((a, b) => b.updatedAt - a.updatedAt),
      reports: [...store.reports].sort((a, b) => b.createdAt - a.createdAt),
      totalUnread,
      getConversation: (id) => store.conversations.find((conversation) => conversation.id === id),
      openConversationWith: (peer, product) => {
        const targetPeer = peerKey(peer);
        const existing = store.conversations.find(
          (conversation) => peerKey(conversation.peer) === targetPeer && (conversation.product?.id ?? conversation.listingId) === product?.id,
        );
        if (existing) return existing.id;
        const now = Date.now();
        const id = `conversation_${now}_${Math.random().toString(36).slice(2, 7)}`;
        const initialMessage: Message[] = product
          ? [{ id: `message_${now}`, from: "me", kind: "product", product, createdAt: now, read: true, status: "sent" }]
          : [];
        const conversation: Conversation = {
          id,
          sellerId: product?.sellerId,
          listingId: product?.id,
          direction: "buying",
          peer,
          product,
          productClosed: product?.closed,
          messages: initialMessage,
          updatedAt: now,
        };
        persist({ ...store, conversations: [conversation, ...store.conversations] });
        return id;
      },
      sendText: (id, text) => {
        if (text.trim()) append(id, { from: "me", kind: "text", text: text.trim() });
      },
      sendImage: (id, image) => append(id, { from: "me", kind: "image", image }),
      sendProduct: (id, product) => append(id, { from: "me", kind: "product", product }),
      sendCoupon: (id, code, percent) => append(id, { from: "me", kind: "coupon", coupon: { code, percent } }),
      sendDelivery: (id, update) => append(id, { from: "me", kind: "delivery", delivery: update }),
      receiveText: (id, text) => append(id, { from: "them", kind: "text", text }),
      receiveImage: (id, image) => append(id, { from: "them", kind: "image", image }),
      isTyping: (id) => Boolean(store.typing[id]),
      markRead: (id) => {
        const conversations = store.conversations.map((conversation) =>
          conversation.id === id
            ? { ...conversation, messages: conversation.messages.map((message) => (message.from === "them" ? { ...message, read: true } : message)) }
            : conversation,
        );
        persist({ ...store, conversations });
      },
      setSpam: (id, spam) => persist({ ...store, conversations: store.conversations.map((conversation) => conversation.id === id ? { ...conversation, spam, autoSpam: spam ? conversation.autoSpam : false } : conversation) }),
      setBlocked: (id, blocked) => persist({ ...store, conversations: store.conversations.map((conversation) => conversation.id === id ? { ...conversation, blocked } : conversation) }),
      setMuted: (id, muted) => persist({ ...store, conversations: store.conversations.map((conversation) => conversation.id === id ? { ...conversation, muted } : conversation) }),
      deleteConversation: (id) => persist({ ...store, conversations: store.conversations.filter((conversation) => conversation.id !== id) }),
      searchMessages: (query) => {
        const term = query.trim().toLowerCase();
        if (!term) return [];
        const results: { conversation: Conversation; message: Message }[] = [];
        for (const conversation of store.conversations) {
          const conversationMatches = [conversation.peer.name, conversation.peer.username, conversation.product?.name].filter(Boolean).some((value) => value!.toLowerCase().includes(term));
          for (const message of conversation.messages) {
            if (conversationMatches || message.text?.toLowerCase().includes(term) || message.product?.name.toLowerCase().includes(term)) {
              results.push({ conversation, message });
            }
          }
        }
        return results.sort((a, b) => b.message.createdAt - a.message.createdAt).slice(0, 30);
      },
      submitReport: ({ conversationId, messageId, seller, reason, details }) => {
        const now = Date.now();
        const report: Report = { id: `report_${now}`, conversationId, messageId, seller, reason, details, status: "submitted", createdAt: now, updatedAt: now, reference: `FX-${now.toString(36).toUpperCase().slice(-6)}` };
        persist({ ...store, reports: [report, ...store.reports] });
        return report;
      },
      canCall: (id) => {
        const conversation = store.conversations.find((item) => item.id === id);
        return conversation ? canCall(conversation.peer) : false;
      },
    };
  }, [append, persist, store]);

  return <MessagesCtx.Provider value={value}>{children}</MessagesCtx.Provider>;
}

export function useMessages() {
  const context = useContext(MessagesCtx);
  if (!context) throw new Error("useMessages must be used inside MessagesProvider");
  return context;
}

export const REPORT_REASONS = ["Spam", "Scam", "Harassment", "Fraudulent listing", "Abusive content", "Other"] as const;

export function reportStatusLabel(status: ReportStatus) {
  return status === "submitted" ? "Submitted" : status === "under_review" ? "Under review" : status === "action_taken" ? "Action taken" : "Dismissed";
}
