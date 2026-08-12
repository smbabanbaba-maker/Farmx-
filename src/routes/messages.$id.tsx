import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMessages, REPORT_REASONS, type Message } from "@/lib/messages-store";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Check,
  CheckCheck,
  EyeOff,
  Flag,
  MapPin,
  MoreVertical,
  Package,
  Paperclip,
  Send,
  ShieldAlert,
  Ticket,
  Trash2,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { products as allProducts } from "@/lib/mock-data";

export const Route = createFileRoute("/messages/$id")({
  head: () => ({
    meta: [
      { title: "Chat — FarmX" },
      { name: "description", content: "Secure in-app chat with buyer/seller." },
      { property: "og:title", content: "FarmX Chat" },
      { property: "og:description", content: "Direct messaging inside FarmX." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChatDetail,
});

function ChatDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const {
    getConversation,
    sendText,
    sendCoupon,
    sendProduct,
    markRead,
    setSpam,
    deleteConversation,
    submitReport,
    isTyping,
  } = useMessages();
  const conv = getConversation(id);
  const [draft, setDraft] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hiddenAds, setHiddenAds] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState("");
  const [reportRef, setReportRef] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conv) markRead(conv.id); /* eslint-disable-next-line */
  }, [id]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv?.messages.length]);

  const grouped = useMemo(() => groupByDay(conv?.messages ?? []), [conv?.messages]);
  const sellerTyping = isTyping(id);

  if (!conv) {
    return (
      <AppShell title="Chat">
        <p className="text-sm text-muted-foreground">Conversation not found.</p>
        <Link to="/messages" className="text-brand text-sm font-semibold">
          ← Back to messages
        </Link>
      </AppShell>
    );
  }

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    sendText(conv.id, text);
    setDraft("");
  };

  const quickActions = [
    "What is your last price?",
    "Please share your location.",
    "I want to make an offer.",
    "Please call me.",
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-2xl px-3 py-2.5 flex items-center gap-2">
          <button
            onClick={() => navigate({ to: "/messages" })}
            className="p-2 rounded-full hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-9 w-9 rounded-full bg-brand/10 flex items-center justify-center text-lg">
            {conv.peer.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="text-sm font-bold truncate">{conv.peer.name}</p>
              {conv.peer.verified && (
                <span
                  title="KYC verified — Bluetek"
                  className="flex items-center gap-0.5 text-brand"
                >
                  <BadgeCheck className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              {conv.peer.verified ? "Verified · KYC complete" : "Unverified"}
              <span>·</span>
              {sellerTyping ? "typing…" : (conv.peer.lastSeen ?? "offline")}
              {conv.peer.location && (
                <>
                  <span>·</span>
                  <MapPin className="h-2.5 w-2.5" />
                  {conv.peer.location}
                </>
              )}
            </p>
          </div>

          {/* 3-dot menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 rounded-full hover:bg-accent"
              aria-label="Chat options"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-52 rounded-xl bg-card border border-border shadow-lg z-20 overflow-hidden">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate({ to: "/market" });
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent text-left"
                  >
                    <Package className="h-4 w-4" /> Show ads
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      deleteConversation(conv.id);
                      navigate({ to: "/messages" });
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent text-left"
                  >
                    <Trash2 className="h-4 w-4" /> Delete chat
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setSpam(conv.id, !conv.spam);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent text-left"
                  >
                    <ShieldAlert className="h-4 w-4" />{" "}
                    {conv.spam ? "Remove from spam" : "Move to spam"}
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setHiddenAds((v) => !v);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent text-left"
                  >
                    <EyeOff className="h-4 w-4" /> {hiddenAds ? "Show seller ads" : "Hide ads"}
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setReportOpen(true);
                      setReportRef(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent text-left text-destructive"
                  >
                    <Flag className="h-4 w-4" /> Report seller
                  </button>
                  <Link
                    to="/reports"
                    onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent text-left"
                  >
                    <ShieldAlert className="h-4 w-4" /> My reports
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
        {conv.product && !hiddenAds && (
          <Link to="/market" className="mx-auto max-w-2xl px-3 pb-2 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 p-2 rounded-lg bg-card border border-border">
              <div className="h-9 w-9 rounded-md bg-brand/5 flex items-center justify-center text-lg">
                {conv.product.image}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">{conv.product.name}</p>
                <p className="text-[11px] text-brand font-bold">
                  ₦{conv.product.price.toLocaleString()}
                </p>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${conv.productClosed ? "bg-muted text-muted-foreground" : "bg-brand/10 text-brand"}`}
              >
                {conv.productClosed ? "Closed ad" : "Discussing"}
              </span>
            </div>
          </Link>
        )}
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-3 py-4 space-y-4">
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-[11px] text-foreground">
              <span className="font-bold">Avoid paying in advance.</span> Use FarmX escrow or pay on
              delivery. Never send money outside the app.
            </p>
          </div>
          {conv.autoSpam && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-destructive/15 border border-destructive/30">
              <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="text-[11px]">
                <p className="font-bold text-destructive">Chat locked by anti-fraud</p>
                <p className="text-muted-foreground">{(conv.fraudReasons ?? []).join(" · ")}</p>
                <button
                  onClick={() => setSpam(conv.id, false)}
                  className="mt-1 font-semibold text-brand"
                >
                  I trust this seller — unlock
                </button>
              </div>
            </div>
          )}
          <div className="text-center">
            <span className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground">
              🔒 Messages are secured inside FarmX
            </span>
          </div>

          {grouped.map((g) => (
            <div key={g.day} className="space-y-2">
              <div className="text-center text-[10px] text-muted-foreground">{g.day}</div>
              {g.messages.map((m) => (
                <MessageBubble key={m.id} m={m} />
              ))}
            </div>
          ))}
          {sellerTyping && <TypingBubble seller={conv.peer.name} />}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Composer */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border">
        <div className="mx-auto max-w-2xl px-3 pt-2 flex gap-1.5 overflow-x-auto">
          {quickActions.map((q) => (
            <button
              key={q}
              onClick={() => sendText(conv.id, q)}
              className="shrink-0 px-3 py-1.5 rounded-full bg-card border border-border text-[11px] font-semibold hover:bg-accent"
            >
              {q}
            </button>
          ))}
        </div>
        {attachOpen && (
          <div className="mx-auto max-w-2xl px-3 pt-3 flex flex-wrap gap-2">
            <button
              onClick={() => {
                sendCoupon(conv.id, "FARMX10", 10);
                setAttachOpen(false);
              }}
              className="px-3 py-1.5 rounded-full bg-card border border-border text-xs font-semibold flex items-center gap-1"
            >
              <Ticket className="h-3.5 w-3.5 text-brand" /> Send coupon
            </button>
            <ProductPicker
              onPick={(p) => {
                sendProduct(conv.id, p);
                setAttachOpen(false);
              }}
            />
            <button
              onClick={() => {
                sendText(conv.id, "🚚 Delivery on the way — I'll share tracking soon.");
                setAttachOpen(false);
              }}
              className="px-3 py-1.5 rounded-full bg-card border border-border text-xs font-semibold flex items-center gap-1"
            >
              <Truck className="h-3.5 w-3.5 text-brand" /> Delivery update
            </button>
          </div>
        )}
        <div className="mx-auto max-w-2xl px-3 py-2.5 flex items-end gap-2">
          <button
            onClick={() => setAttachOpen((v) => !v)}
            className={`p-2 rounded-full ${attachOpen ? "bg-brand text-brand-foreground" : "hover:bg-accent"}`}
            aria-label="Attach"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 resize-none max-h-32 px-3 py-2 rounded-2xl bg-card border border-border text-sm outline-none focus:border-brand"
          />
          <button
            onClick={submit}
            disabled={!draft.trim()}
            className="p-2.5 rounded-full bg-brand text-brand-foreground disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Report seller modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-3">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-4">
            {reportRef ? (
              <div className="text-center py-4">
                <Flag className="mx-auto h-8 w-8 text-brand" />
                <p className="mt-2 text-sm font-bold">Report submitted</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Reference {reportRef}. Our safety team will review it.
                </p>
                <div className="mt-4 flex gap-2">
                  <Link
                    to="/reports"
                    className="flex-1 py-2 rounded-lg bg-brand text-brand-foreground text-sm font-semibold text-center"
                  >
                    View report status
                  </Link>
                  <button
                    onClick={() => setReportOpen(false)}
                    className="flex-1 py-2 rounded-lg bg-muted text-sm font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm font-bold">Report {conv.peer.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Choose a reason and add details. Chats are attached as evidence.
                </p>

                <div className="mt-3 space-y-1.5 max-h-52 overflow-y-auto">
                  {REPORT_REASONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setReportReason(r)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-semibold ${
                        reportReason === r
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-border bg-background"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value.slice(0, 500))}
                  placeholder="Describe what happened…"
                  rows={3}
                  className="mt-3 w-full resize-none px-3 py-2 rounded-xl bg-background border border-border text-sm outline-none focus:border-brand"
                />
                <p className="text-[10px] text-muted-foreground text-right">
                  {reportDetails.length}/500
                </p>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setReportOpen(false)}
                    className="flex-1 py-2 rounded-lg bg-muted text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={reportDetails.trim().length < 10}
                    onClick={() => {
                      const r = submitReport({
                        conversationId: conv.id,
                        seller: conv.peer.name,
                        reason: reportReason,
                        details: reportDetails.trim(),
                      });
                      setReportRef(r.reference);
                      setReportDetails("");
                    }}
                    className="flex-1 py-2 rounded-lg bg-destructive text-white text-sm font-semibold disabled:opacity-40"
                  >
                    Submit report
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 text-center">
                  Add at least 10 characters of detail.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TypingBubble({ seller }: { seller: string }) {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md border border-border bg-card px-3 py-2">
        <p className="text-[10px] text-muted-foreground">{seller} is typing</p>
        <div className="mt-1 flex gap-1" aria-label="Seller is typing">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.2s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand [animation-delay:-0.1s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ m }: { m: Message }) {
  const mine = m.from === "me";
  const time = new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (m.kind === "system") {
    return (
      <div className="flex justify-center">
        <p className="max-w-[90%] text-center text-[11px] px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
          {m.text}
        </p>
      </div>
    );
  }

  const body = (() => {
    if (m.kind === "product" && m.product) {
      return (
        <div className="w-56">
          <div className="aspect-video bg-brand/5 rounded-lg flex items-center justify-center text-4xl">
            {m.product.image}
          </div>
          <p className="mt-1.5 text-sm font-semibold truncate">{m.product.name}</p>
          <p className="text-xs text-brand font-bold">₦{m.product.price.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground truncate">by {m.product.seller}</p>
          <Link
            to="/market"
            className="mt-1.5 block text-center text-[11px] py-1 rounded-md bg-brand text-brand-foreground font-semibold"
          >
            View in market
          </Link>
        </div>
      );
    }
    if (m.kind === "delivery" && m.delivery) {
      return (
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-brand shrink-0" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide">
              Delivery · {m.delivery.status.replace("_", " ")}
            </p>
            {m.delivery.note && <p className="text-xs">{m.delivery.note}</p>}
          </div>
        </div>
      );
    }
    if (m.kind === "coupon" && m.coupon) {
      return (
        <div className="flex items-center gap-2">
          <Ticket className="h-5 w-5 text-brand shrink-0" />
          <div>
            <p className="text-xs font-bold">Coupon: {m.coupon.code}</p>
            <p className="text-[11px]">{m.coupon.percent}% off your next order</p>
          </div>
        </div>
      );
    }
    return <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>;
  })();

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] px-3 py-2 rounded-2xl ${
          mine
            ? "bg-brand text-brand-foreground rounded-br-md"
            : m.flagged
              ? "bg-destructive/10 border border-destructive/30 rounded-bl-md"
              : "bg-card border border-border rounded-bl-md"
        }`}
      >
        {m.flagged && (
          <p className="mb-1 text-[10px] font-bold text-destructive flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" /> Flagged: {m.flagReason}
          </p>
        )}
        {body}
        <div
          className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? "text-brand-foreground/80" : "text-muted-foreground"}`}
        >
          <span>{time}</span>
          {mine && (
            <span
              title={m.status === "seen" ? "Seen" : m.status === "delivered" ? "Delivered" : "Sent"}
              className="flex items-center gap-0.5"
            >
              {m.status === "seen" ? (
                <CheckCheck className="h-3 w-3 text-sky-300" />
              ) : m.status === "delivered" ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">
                {m.status === "seen" ? "Seen" : m.status === "delivered" ? "Delivered" : "Sent"}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductPicker({
  onPick,
}: {
  onPick: (p: { id: string; name: string; price: number; image: string; seller: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1.5 rounded-full bg-card border border-border text-xs font-semibold flex items-center gap-1"
      >
        📦 Send product
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-64 max-h-60 overflow-y-auto rounded-xl bg-card border border-border shadow-lg z-10">
          {allProducts.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onPick({
                  id: p.id,
                  name: p.name,
                  price: p.price,
                  image: p.image,
                  seller: p.seller,
                });
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-accent text-left"
            >
              <span className="text-xl">{p.image}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">{p.name}</p>
                <p className="text-[10px] text-brand font-bold">₦{p.price.toLocaleString()}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function groupByDay(msgs: Message[]) {
  const groups: { day: string; messages: Message[] }[] = [];
  for (const m of msgs) {
    const d = new Date(m.createdAt);
    const key = isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : d.toLocaleDateString();
    const last = groups[groups.length - 1];
    if (last && last.day === key) last.messages.push(m);
    else groups.push({ day: key, messages: [m] });
  }
  return groups;
}
function isToday(d: Date) {
  const n = new Date();
  return d.toDateString() === n.toDateString();
}
function isYesterday(d: Date) {
  const n = new Date();
  n.setDate(n.getDate() - 1);
  return d.toDateString() === n.toDateString();
}
