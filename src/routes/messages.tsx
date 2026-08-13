import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMessages, type Conversation, type Message } from "@/lib/messages-store";
import {
  BadgeCheck,
  BellOff,
  Clock3,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Tag,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Chats — FarmX" },
      { name: "description", content: "Marketplace conversations between FarmX buyers and sellers." },
      { property: "og:title", content: "FarmX Chats" },
      { property: "og:description", content: "Communicate safely about FarmX listings." },
    ],
  }),
  component: MessagesInbox,
});

type Tab = "all" | "unread" | "buying" | "selling";
const TABS: { key: Tab; label: string; icon: typeof MessageCircle }[] = [
  { key: "all", label: "All", icon: MessageCircle },
  { key: "unread", label: "Unread", icon: BellOff },
  { key: "buying", label: "Buying", icon: ShoppingBag },
  { key: "selling", label: "Selling", icon: Tag },
];

function MessagesInbox() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { conversations, totalUnread } = useMessages();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  const list = useMemo(() => {
    const term = query.trim().toLowerCase();
    return conversations.filter((conversation) => {
      if (conversation.blocked) return false;
      const unread = unreadCount(conversation) > 0;
      if (tab === "unread" && !unread) return false;
      if (tab === "buying" && conversation.direction !== "buying") return false;
      if (tab === "selling" && conversation.direction !== "selling") return false;
      if (!term) return true;
      const searchable = [
        conversation.peer.name,
        conversation.peer.username,
        conversation.product?.name,
        ...conversation.messages.map((message) => message.text),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(term);
    });
  }, [conversations, query, tab]);

  const counts = useMemo(
    () => ({
      all: conversations.filter((conversation) => !conversation.blocked).length,
      unread: conversations.filter((conversation) => !conversation.blocked && unreadCount(conversation) > 0).length,
      buying: conversations.filter((conversation) => !conversation.blocked && conversation.direction === "buying").length,
      selling: conversations.filter((conversation) => !conversation.blocked && conversation.direction === "selling").length,
    }),
    [conversations],
  );

  if (pathname.startsWith("/messages/")) return <Outlet />;

  return (
    <AppShell title="Chats">
      <div className="mx-auto max-w-2xl space-y-4 pb-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">FarmX marketplace</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">Chats</h1>
            <p className="mt-1 text-xs text-muted-foreground">Talk directly with buyers and sellers about real listings.</p>
          </div>
          <Link
            to="/market"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-lg shadow-brand/20 transition hover:opacity-90"
            aria-label="Start a chat from the market"
            title="Start a chat from the market"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </header>

        <div className="rounded-3xl border border-brand/15 bg-brand/[0.04] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-black">Safe marketplace conversations</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Discuss the listing, verify the person, and inspect the item before any private transaction. FarmX does not process buyer-to-seller payments here.</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, username, listing or message"
            className="w-full rounded-2xl border border-border bg-card py-3.5 pl-11 pr-11 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
            aria-label="Search chats"
          />
          <SlidersHorizontal className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11px] font-black transition active:scale-[0.98] ${tab === key ? "border-brand bg-brand text-brand-foreground shadow-sm" : "border-border bg-card text-muted-foreground hover:border-brand/40 hover:text-brand"}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {counts[key] > 0 && <span className="opacity-80">{counts[key]}</span>}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] font-semibold text-muted-foreground">
            {totalUnread > 0 ? `${totalUnread} unread message${totalUnread === 1 ? "" : "s"}` : "All caught up"}
          </p>
          <span className="text-[10px] font-bold text-muted-foreground">{list.length} conversation{list.length === 1 ? "" : "s"}</span>
        </div>

        {list.length === 0 ? (
          <EmptyState hasSearch={Boolean(query.trim())} />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <ul className="divide-y divide-border">
              {list.map((conversation) => (
                <ConversationRow key={conversation.id} conversation={conversation} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ConversationRow({ conversation }: { conversation: Conversation }) {
  const last = conversation.messages[conversation.messages.length - 1];
  const unread = unreadCount(conversation);
  return (
    <li>
      <Link
        to="/messages/$id"
        params={{ id: conversation.id }}
        className={`flex gap-3 px-4 py-4 transition hover:bg-brand/[0.03] active:bg-brand/[0.06] ${unread ? "bg-brand/[0.025]" : ""}`}
      >
        <div className="relative shrink-0">
          <Avatar conversation={conversation} />
          {conversation.peer.online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" aria-label="Online" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className={`truncate text-sm ${unread ? "font-black" : "font-bold"}`}>{conversation.peer.name}</p>
              {conversation.peer.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-brand" aria-label="Verified" />}
              {conversation.muted && <BellOff className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Muted" />}
            </div>
            <span className={`shrink-0 text-[10px] ${unread ? "font-black text-brand" : "text-muted-foreground"}`}>{timeAgo(conversation.updatedAt)}</span>
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[10px] font-semibold text-brand">{conversation.product?.name ?? "FarmX conversation"}</span>
            {conversation.product && <span className="shrink-0 text-[9px] text-muted-foreground">· {conversation.direction === "selling" ? "Selling" : "Buying"}</span>}
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className={`truncate text-xs ${unread ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{lastMessagePreview(last)}</p>
            {unread > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-black text-brand-foreground">{unread}</span>}
          </div>
        </div>
      </Link>
    </li>
  );
}

function Avatar({ conversation }: { conversation: Conversation }) {
  const avatar = conversation.peer.avatar;
  return avatar.startsWith("http") ? (
    <img src={avatar} alt="" className="h-12 w-12 rounded-2xl border border-border object-cover" />
  ) : (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-xl">{avatar || <UserRound className="h-5 w-5 text-brand" />}</div>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand"><MessageCircle className="h-7 w-7" /></div>
      <h2 className="mt-4 text-base font-black">{hasSearch ? "No chats found" : "No conversations yet"}</h2>
      <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">{hasSearch ? "Try another name, listing title or message." : "Start a conversation with a seller or buyer from a FarmX listing."}</p>
      {!hasSearch && <Link to="/market" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-black text-brand-foreground shadow-lg shadow-brand/15"><ShoppingBag className="h-3.5 w-3.5" /> Browse Market</Link>}
    </div>
  );
}

function unreadCount(conversation: Conversation) {
  return conversation.messages.filter((message) => message.from === "them" && !message.read).length;
}

function lastMessagePreview(message: Message | undefined) {
  if (!message) return "No messages yet";
  if (message.kind === "image") return "Image";
  if (message.kind === "product") return `Listing: ${message.product?.name ?? "FarmX listing"}`;
  if (message.kind === "delivery") return `Delivery update: ${message.delivery?.status ?? "Updated"}`;
  if (message.kind === "coupon") return `Coupon: ${message.coupon?.code ?? "Shared"}`;
  return message.text ?? "Message";
}

function timeAgo(timestamp: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
