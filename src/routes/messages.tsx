import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMessages } from "@/lib/messages-store";
import { BadgeCheck, Flag, MessageSquare, Search, ShieldAlert } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Messages — FarmX" },
      {
        name: "description",
        content:
          "Chat directly with verified buyers and sellers about products, prices and delivery.",
      },
      { property: "og:title", content: "FarmX Messages" },
      {
        property: "og:description",
        content: "Secure in-app messaging between buyers and sellers.",
      },
    ],
  }),
  component: MessagesInbox,
});

type Tab = "all" | "unread" | "unanswered" | "spam";
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "unanswered", label: "Unanswered" },
  { key: "spam", label: "Spam" },
];

function MessagesInbox() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { conversations, totalUnread, searchMessages } = useMessages();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const hits = q.trim() ? searchMessages(q) : [];

  const unreadCount = (c: (typeof conversations)[number]) =>
    c.messages.filter((m) => m.from === "them" && !m.read).length;
  const isUnanswered = (c: (typeof conversations)[number]) =>
    c.messages.length > 0 && c.messages[c.messages.length - 1].from === "them";

  const counts = {
    all: conversations.filter((c) => !c.spam).length,
    unread: conversations.filter((c) => !c.spam && unreadCount(c) > 0).length,
    unanswered: conversations.filter((c) => !c.spam && isUnanswered(c)).length,
    spam: conversations.filter((c) => c.spam).length,
  };

  if (pathname.startsWith("/messages/")) return <Outlet />;

  const list = conversations
    .filter((c) =>
      tab === "spam"
        ? c.spam
        : c.spam
          ? false
          : tab === "unread"
            ? unreadCount(c) > 0
            : tab === "unanswered"
              ? isUnanswered(c)
              : true,
    )
    .filter(
      (c) =>
        !q ||
        c.peer.name.toLowerCase().includes(q.toLowerCase()) ||
        c.product?.name.toLowerCase().includes(q.toLowerCase()),
    );

  return (
    <AppShell title="Live chats">
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-brand/20 bg-brand/5 px-3 py-2">
          <div>
            <p className="text-sm font-bold">Buyer & seller live chat</p>
            <p className="text-[11px] text-muted-foreground">
              Messages, typing status, read receipts and secure in-app replies.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1 text-[10px] font-bold text-green-600">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> LIVE
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search chats, sellers or message text…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card border border-border text-sm"
          />
        </div>

        {hits.length > 0 && (
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            <p className="px-3 py-2 text-[11px] font-bold text-muted-foreground border-b border-border">
              {hits.length} message match{hits.length > 1 ? "es" : ""}
            </p>
            <ul className="divide-y divide-border max-h-64 overflow-y-auto">
              {hits.map(({ conversation, message }) => (
                <li key={message.id}>
                  <Link
                    to="/messages/$id"
                    params={{ id: conversation.id }}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-accent/50"
                  >
                    <span className="text-lg">{conversation.peer.avatar}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{conversation.peer.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {message.text ?? message.product?.name}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {timeAgo(message.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                tab === t.key
                  ? "bg-brand text-brand-foreground border-brand"
                  : "bg-card text-muted-foreground border-border"
              }`}
            >
              {t.label}
              {counts[t.key] > 0 && <span className="ml-1 opacity-80">({counts[t.key]})</span>}
            </button>
          ))}
          <Link
            to="/reports"
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border border-border bg-card text-muted-foreground flex items-center gap-1"
          >
            <Flag className="h-3 w-3" /> My reports
          </Link>
        </div>

        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            {totalUnread > 0 ? `${totalUnread} unread` : "All caught up"}
          </p>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand/10 text-brand font-semibold">
            🔒 In-app secure
          </span>
        </div>

        {list.length === 0 ? (
          <div className="py-16 text-center">
            <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-semibold">No conversations here</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tap “Message seller” on any product to start a chat.
            </p>
            <Link
              to="/market"
              className="inline-block mt-4 px-4 py-2 rounded-lg bg-brand text-brand-foreground text-sm font-semibold"
            >
              Browse market
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-2xl bg-card border border-border overflow-hidden">
            {list.map((c) => {
              const last = c.messages[c.messages.length - 1];
              const unread = c.messages.filter((m) => m.from === "them" && !m.read).length;
              const preview =
                last?.kind === "text"
                  ? last.text
                  : last?.kind === "product"
                    ? `📦 ${last.product?.name}`
                    : last?.kind === "delivery"
                      ? `🚚 Delivery: ${last.delivery?.status}`
                      : last?.kind === "coupon"
                        ? `🎟️ Coupon ${last.coupon?.code}`
                        : "New conversation";
              return (
                <li key={c.id}>
                  <Link
                    to="/messages/$id"
                    params={{ id: c.id }}
                    className="flex items-center gap-3 px-3 py-3 hover:bg-accent/50 transition"
                  >
                    <div className="h-11 w-11 rounded-full bg-brand/10 flex items-center justify-center text-xl shrink-0">
                      {c.peer.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-semibold truncate">{c.peer.name}</p>
                        {c.peer.verified && (
                          <BadgeCheck className="h-3.5 w-3.5 text-brand shrink-0" />
                        )}
                        {c.spam && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold shrink-0">
                            SPAM
                          </span>
                        )}
                      </div>
                      {c.product && (
                        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                          <span className="truncate">{c.product.name}</span>
                          {c.productClosed && (
                            <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                              Closed ad
                            </span>
                          )}
                        </p>
                      )}
                      <p
                        className={`text-xs truncate ${unread ? "text-foreground font-medium" : "text-muted-foreground"}`}
                      >
                        {last?.from === "me" ? "You: " : ""}
                        {preview}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground">
                        {timeAgo(c.updatedAt)}
                      </span>
                      {unread > 0 && (
                        <span className="min-w-5 h-5 px-1.5 rounded-full bg-brand text-brand-foreground text-[10px] font-bold flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
