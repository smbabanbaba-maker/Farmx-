import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  useMessages,
  REPORT_REASONS,
  type Conversation,
  type MediaAttachment,
  type Message,
  type ProductRef,
} from "@/lib/messages-store";
import { products as allProducts } from "@/lib/mock-data";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Ban,
  Check,
  CheckCheck,
  ChevronRight,
  Eye,
  Flag,
  Image as ImageIcon,
  Link2,
  Loader2,
  MapPin,
  MoreVertical,
  Paperclip,
  Phone,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Ticket,
  Trash2,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/messages/$id")({
  head: () => ({
    meta: [
      { title: "Chat — FarmX" },
      { name: "description", content: "Secure marketplace conversation on FarmX." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChatDetail,
});

type ConfirmAction = "block" | "delete" | null;

function ChatDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const {
    getConversation,
    sendText,
    sendImage,
    sendProduct,
    sendCoupon,
    markRead,
    setSpam,
    setBlocked,
    setMuted,
    deleteConversation,
    submitReport,
    canCall,
  } = useMessages();
  const conversation = getConversation(id);
  const [draft, setDraft] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState("");
  const [reportRef, setReportRef] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [imageSending, setImageSending] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (conversation) markRead(conversation.id); // The provider owns receipt persistence.
    const quickMessage = new URLSearchParams(window.location.search).get("q");
    if (quickMessage) setDraft(quickMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages.length]);

  const grouped = useMemo(() => groupByDay(conversation?.messages ?? []), [conversation?.messages]);

  if (!conversation) {
    return (
      <AppShell title="Chat">
        <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <MessageNotFound />
          <h1 className="mt-4 text-base font-black">Conversation not found</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            This conversation may have been removed or is not available on this account.
          </p>
          <Link
            to="/messages"
            className="mt-5 inline-flex rounded-xl bg-brand px-4 py-2.5 text-xs font-black text-brand-foreground"
          >
            Back to Chats
          </Link>
        </div>
      </AppShell>
    );
  }

  const submit = () => {
    const text = draft.trim();
    if (!text || conversation.blocked) return;
    sendText(conversation.id, text);
    setDraft("");
  };

  const selectImage = async (file: File | undefined) => {
    if (!file || conversation.blocked) return;
    setImageError(null);
    if (file.size > 2 * 1024 * 1024) {
      setImageError("Preview images must be 2MB or smaller.");
      return;
    }
    if (!/^image\/(jpeg|jpg|png|webp|heic)$/i.test(file.type)) {
      setImageError("Please select a JPG, PNG, WEBP or HEIC image.");
      return;
    }
    setImageSending(true);
    try {
      const image: MediaAttachment = {
        url: await fileToDataUrl(file),
        name: file.name,
        uploading: false,
      };
      sendImage(conversation.id, image);
      setAttachOpen(false);
    } catch {
      setImageError("Unable to attach this image. Try again.");
    } finally {
      setImageSending(false);
    }
  };

  const performConfirm = () => {
    if (confirmAction === "block") {
      setBlocked(conversation.id, true);
      setConfirmAction(null);
      navigate({ to: "/messages" });
      return;
    }
    if (confirmAction === "delete") {
      deleteConversation(conversation.id);
      setConfirmAction(null);
      navigate({ to: "/messages" });
    }
  };

  const callAvailable = canCall(conversation.id) && Boolean(conversation.peer.phone);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={() => navigate({ to: "/messages" })}
            className="rounded-full p-2 transition hover:bg-accent"
            aria-label="Back to chats"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <ProfileAvatar peer={conversation.peer} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {conversation.peer.username ? (
                <Link
                  to="/u/$username"
                  params={{ username: conversation.peer.username }}
                  className="truncate text-sm font-black hover:text-brand"
                >
                  {conversation.peer.name}
                </Link>
              ) : (
                <p className="truncate text-sm font-black">{conversation.peer.name}</p>
              )}
              {conversation.peer.verified && (
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-brand" aria-label="Verified" />
              )}
            </div>
            <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
              {conversation.peer.online ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online
                </>
              ) : (
                (conversation.peer.lastSeen ?? "Last seen unavailable")
              )}
              {conversation.peer.location && (
                <>
                  <span>·</span>
                  <MapPin className="h-2.5 w-2.5" />
                  {conversation.peer.location}
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            disabled={!callAvailable}
            onClick={() => {
              if (conversation.peer.phone) window.location.href = `tel:${conversation.peer.phone}`;
            }}
            className="rounded-full p-2 text-brand transition hover:bg-brand/10 disabled:cursor-not-allowed disabled:text-muted-foreground"
            aria-label={callAvailable ? "Call seller" : "Seller has disabled calls"}
            title={
              callAvailable ? "Call" : "Seller has disabled calls or has no public phone number"
            }
          >
            <Phone className="h-4 w-4" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded-full p-2 transition hover:bg-accent"
              aria-label="Chat options"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {menuOpen && (
              <ChatMenu
                conversation={conversation}
                onClose={() => setMenuOpen(false)}
                onMute={() => {
                  setMuted(conversation.id, !conversation.muted);
                  setMenuOpen(false);
                }}
                onBlock={() => {
                  setMenuOpen(false);
                  setConfirmAction("block");
                }}
                onDelete={() => {
                  setMenuOpen(false);
                  setConfirmAction("delete");
                }}
                onReport={() => {
                  setMenuOpen(false);
                  setReportOpen(true);
                  setReportRef(null);
                }}
              />
            )}
          </div>
        </div>
        {conversation.product && <ListingContextCard product={conversation.product} />}
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-2xl space-y-4 px-3 py-4 pb-8">
          {!online && (
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted px-3 py-2 text-[11px] font-bold text-muted-foreground">
              <AlertTriangle className="h-4 w-4 shrink-0" /> You're offline. Messages stay here and
              will sync when connection returns.
            </div>
          )}
          <SafetyReminder />
          {conversation.autoSpam && (
            <SpamNotice
              conversation={conversation}
              onUnlock={() => setSpam(conversation.id, false)}
            />
          )}
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[10px] font-semibold text-muted-foreground">
              <ShieldCheck className="h-3 w-3" /> Private FarmX conversation
            </span>
          </div>
          {grouped.map((group) => (
            <div key={group.day} className="space-y-2">
              <p className="text-center text-[10px] font-semibold text-muted-foreground">
                {group.day}
              </p>
              {group.messages.map((message) => (
                <MessageBubble key={message.id} message={message} onPreview={setPhotoPreview} />
              ))}
            </div>
          ))}
          {conversation.messages.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center">
              <MessageCircleIcon />
              <p className="mt-3 text-sm font-black">Start the conversation</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ask a clear question about the listing. Your message will not be sent until you tap
                Send.
              </p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="sticky bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-3 pt-2">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              "Is this still available?",
              "What is your last price?",
              "Where can I inspect it?",
              "Is delivery available?",
            ].map((quickReply) => (
              <button
                key={quickReply}
                type="button"
                onClick={() => setDraft(quickReply)}
                className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-[10px] font-bold text-muted-foreground transition hover:border-brand hover:text-brand"
              >
                {quickReply}
              </button>
            ))}
          </div>
          {attachOpen && (
            <div className="mb-2 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-3 shadow-lg">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-brand"
              >
                <ImageIcon className="h-4 w-4 text-brand" /> Photo
              </button>
              <ProductPicker
                onPick={(product) => {
                  sendProduct(conversation.id, product);
                  setAttachOpen(false);
                }}
              />
              <button
                type="button"
                onClick={() => {
                  sendCoupon(conversation.id, "FARMX10", 10);
                  setAttachOpen(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-brand"
              >
                <Ticket className="h-4 w-4 text-brand" /> Coupon
              </button>
            </div>
          )}
          {imageError && (
            <p className="mb-2 text-[10px] font-bold text-destructive">{imageError}</p>
          )}
          <div className="flex items-end gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              disabled={conversation.blocked || imageSending}
              onClick={() => setAttachOpen((open) => !open)}
              className={`rounded-full p-2.5 transition ${attachOpen ? "bg-brand text-brand-foreground" : "hover:bg-accent"} disabled:opacity-40`}
              aria-label="Attach"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              onChange={(event) => {
                void selectImage(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <textarea
              disabled={conversation.blocked}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder={
                conversation.blocked ? "This conversation is blocked" : "Write a message…"
              }
              rows={1}
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-card px-3 py-3 text-sm outline-none transition focus:border-brand disabled:cursor-not-allowed disabled:bg-muted"
            />
            <button
              type="button"
              disabled={!draft.trim() || conversation.blocked}
              onClick={submit}
              className="rounded-full bg-brand p-3 text-brand-foreground shadow-lg shadow-brand/15 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </footer>

      {photoPreview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-5"
          onClick={() => setPhotoPreview(null)}
        >
          <button
            type="button"
            onClick={() => setPhotoPreview(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"
            aria-label="Close image"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={photoPreview}
            alt="Message attachment"
            className="max-h-[88vh] max-w-full rounded-2xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
      {confirmAction && (
        <ConfirmDialog
          action={confirmAction}
          peerName={conversation.peer.name}
          onCancel={() => setConfirmAction(null)}
          onConfirm={performConfirm}
        />
      )}
      {reportOpen && (
        <ReportDialog
          peerName={conversation.peer.name}
          reportRef={reportRef}
          reason={reportReason}
          details={reportDetails}
          onReason={setReportReason}
          onDetails={setReportDetails}
          onClose={() => setReportOpen(false)}
          onSubmit={() => {
            const report = submitReport({
              conversationId: conversation.id,
              seller: conversation.peer.name,
              reason: reportReason,
              details: reportDetails.trim(),
            });
            setReportRef(report.reference);
            setReportDetails("");
          }}
        />
      )}
    </div>
  );
}

function ProfileAvatar({ peer }: { peer: Conversation["peer"] }) {
  return peer.avatar.startsWith("http") ? (
    <img
      src={peer.avatar}
      alt=""
      className="h-10 w-10 shrink-0 rounded-2xl border border-border object-cover"
    />
  ) : (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-lg">
      {peer.avatar || <UserRound className="h-5 w-5 text-brand" />}
    </div>
  );
}

function ListingContextCard({ product }: { product: ProductRef }) {
  return (
    <Link
      to="/product/$id"
      params={{ id: product.id }}
      className="mx-auto flex max-w-2xl items-center gap-3 border-t border-border px-3 py-2 transition hover:bg-brand/[0.03]"
    >
      <ProductVisual product={product} className="h-12 w-16" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-black">{product.name}</p>
        <p className="text-[11px] font-black text-brand">₦{product.price.toLocaleString()}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {product.location ?? "FarmX listing"}
        </p>
      </div>
      <span className="flex items-center gap-1 text-[10px] font-black text-brand">
        View listing <ChevronRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

function ProductVisual({ product, className }: { product: ProductRef; className?: string }) {
  return product.image.startsWith("http") ? (
    <img src={product.image} alt="" className={`${className ?? ""} rounded-xl object-cover`} />
  ) : (
    <div
      className={`${className ?? ""} flex items-center justify-center rounded-xl bg-brand/10 text-2xl`}
    >
      {product.image || <ShoppingBag className="h-5 w-5 text-brand" />}
    </div>
  );
}

function SafetyReminder() {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="text-[11px] leading-relaxed">
        <span className="font-black">Stay safe.</span> Verify the seller and item before making any
        payment. FarmX does not process private buyer-to-seller payments.
      </p>
    </div>
  );
}

function SpamNotice({
  conversation,
  onUnlock,
}: {
  conversation: Conversation;
  onUnlock: () => void;
}) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-destructive/25 bg-destructive/10 p-3">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div className="text-[11px]">
        <p className="font-black text-destructive">Safety review applied</p>
        <p className="mt-1 text-muted-foreground">
          {(conversation.fraudReasons ?? []).join(" · ") ||
            "Potentially unsafe message content detected."}
        </p>
        <button type="button" onClick={onUnlock} className="mt-2 font-black text-brand">
          I understand — restore chat
        </button>
      </div>
    </div>
  );
}

function ChatMenu({
  conversation,
  onClose,
  onMute,
  onBlock,
  onDelete,
  onReport,
}: {
  conversation: Conversation;
  onClose: () => void;
  onMute: () => void;
  onBlock: () => void;
  onDelete: () => void;
  onReport: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-10 cursor-default"
        onClick={onClose}
        aria-label="Close menu"
      />
      <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-2xl border border-border bg-card py-1 shadow-xl">
        <button
          type="button"
          onClick={onMute}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-bold hover:bg-accent"
        >
          {conversation.muted ? "Unmute notifications" : "Mute notifications"}
        </button>
        <button
          type="button"
          onClick={onBlock}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-bold hover:bg-accent"
        >
          <Ban className="h-4 w-4 text-destructive" /> Block user
        </button>
        <button
          type="button"
          onClick={onReport}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-bold text-destructive hover:bg-accent"
        >
          <Flag className="h-4 w-4" /> Report user
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs font-bold hover:bg-accent"
        >
          <Trash2 className="h-4 w-4" /> Delete conversation
        </button>
        <Link
          to="/reports"
          onClick={onClose}
          className="flex w-full items-center gap-2 px-4 py-3 text-xs font-bold hover:bg-accent"
        >
          <Search className="h-4 w-4" /> My reports
        </Link>
      </div>
    </>
  );
}

function ConfirmDialog({
  action,
  peerName,
  onCancel,
  onConfirm,
}: {
  action: Exclude<ConfirmAction, null>;
  peerName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const block = action === "block";
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 p-3 sm:items-center">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-2xl">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${block ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground"}`}
        >
          {block ? <Ban className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
        </div>
        <h2 className="mt-4 text-base font-black">
          {block ? `Block ${peerName}?` : "Delete conversation?"}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {block
            ? "They will not be able to start new messages with you. Existing records are not erased."
            : "This removes the conversation from your Chats view. This action cannot be undone here."}
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
            className={`flex-1 rounded-xl py-3 text-xs font-black text-white ${block ? "bg-destructive" : "bg-foreground"}`}
          >
            {block ? "Block user" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportDialog({
  peerName,
  reportRef,
  reason,
  details,
  onReason,
  onDetails,
  onClose,
  onSubmit,
}: {
  peerName: string;
  reportRef: string | null;
  reason: string;
  details: string;
  onReason: (reason: string) => void;
  onDetails: (details: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 p-3 sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-2xl">
        {reportRef ? (
          <div className="py-4 text-center">
            <Flag className="mx-auto h-8 w-8 text-brand" />
            <h2 className="mt-3 text-base font-black">Report submitted</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Reference {reportRef}. FarmX moderation will review it.
            </p>
            <div className="mt-5 flex gap-2">
              <Link
                to="/reports"
                className="flex-1 rounded-xl bg-brand py-3 text-center text-xs font-black text-brand-foreground"
              >
                View report
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-muted py-3 text-xs font-black"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-base font-black">Report {peerName}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose a reason and add enough detail for moderation.
            </p>
            <div className="mt-4 grid gap-2">
              {REPORT_REASONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onReason(item)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-xs font-bold ${reason === item ? "border-brand bg-brand/5 text-brand" : "border-border"}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <textarea
              value={details}
              onChange={(event) => onDetails(event.target.value.slice(0, 500))}
              rows={4}
              placeholder="Describe what happened…"
              className="mt-4 w-full resize-none rounded-2xl border border-border bg-background p-3 text-sm outline-none focus:border-brand"
            />
            <p className="text-right text-[10px] text-muted-foreground">{details.length}/500</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-border py-3 text-xs font-black"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={details.trim().length < 10}
                onClick={onSubmit}
                className="flex-1 rounded-xl bg-destructive py-3 text-xs font-black text-white disabled:opacity-40"
              >
                Submit report
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onPreview,
}: {
  message: Message;
  onPreview: (url: string) => void;
}) {
  const mine = message.from === "me";
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (message.kind === "system")
    return (
      <div className="flex justify-center">
        <p className="max-w-[90%] rounded-2xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-center text-[11px] text-destructive">
          {message.text}
        </p>
      </div>
    );
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-3xl px-3.5 py-2.5 ${mine ? "rounded-br-md bg-brand text-brand-foreground" : message.flagged ? "rounded-bl-md border border-destructive/30 bg-destructive/10" : "rounded-bl-md border border-border bg-card"}`}
      >
        {message.flagged && (
          <p className="mb-1 flex items-center gap-1 text-[10px] font-black text-destructive">
            <ShieldAlert className="h-3 w-3" /> {message.flagReason}
          </p>
        )}
        {message.kind === "image" && message.image ? (
          <button
            type="button"
            onClick={() => onPreview(message.image!.url)}
            className="block overflow-hidden rounded-2xl"
          >
            <img
              src={message.image.url}
              alt={message.image.name ?? "Message image"}
              className="max-h-64 max-w-full object-cover"
            />
          </button>
        ) : message.kind === "product" && message.product ? (
          <SharedListing product={message.product} />
        ) : message.kind === "delivery" && message.delivery ? (
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-brand" />
            <div>
              <p className="text-xs font-black uppercase">
                Delivery · {message.delivery.status.replace("_", " ")}
              </p>
              {message.delivery.note && <p className="text-xs">{message.delivery.note}</p>}
            </div>
          </div>
        ) : message.kind === "coupon" && message.coupon ? (
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-brand" />
            <div>
              <p className="text-xs font-black">Coupon: {message.coupon.code}</p>
              <p className="text-[11px]">{message.coupon.percent}% offer shared</p>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
        )}
        <div
          className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? "text-brand-foreground/80" : "text-muted-foreground"}`}
        >
          <span>{time}</span>
          {mine && <Receipt status={message.status} />}
        </div>
      </div>
    </div>
  );
}

function SharedListing({ product }: { product: ProductRef }) {
  return (
    <Link
      to="/product/$id"
      params={{ id: product.id }}
      className="block w-60 rounded-2xl border border-brand/20 bg-background/40 p-2 transition hover:border-brand"
    >
      <ProductVisual product={product} className="h-28 w-full" />
      <p className="mt-2 truncate text-sm font-black">{product.name}</p>
      <p className="text-xs font-black text-brand">₦{product.price.toLocaleString()}</p>
      <p className="mt-1 flex items-center justify-end gap-1 text-[10px] font-black text-brand">
        View listing <ChevronRight className="h-3 w-3" />
      </p>
    </Link>
  );
}

function Receipt({ status }: { status?: Message["status"] }) {
  if (status === "failed") return <span className="font-bold text-destructive">Failed</span>;
  if (status === "sending") return <Loader2 className="h-3 w-3 animate-spin" />;
  if (status === "delivered")
    return (
      <>
        <CheckCheck className="h-3 w-3" />
        <span className="hidden sm:inline">Delivered</span>
      </>
    );
  if (status === "seen" || status === "read")
    return (
      <>
        <CheckCheck className="h-3 w-3 text-sky-300" />
        <span className="hidden sm:inline">Read</span>
      </>
    );
  return (
    <>
      <Check className="h-3 w-3" />
      <span className="hidden sm:inline">Sent</span>
    </>
  );
}

function ProductPicker({ onPick }: { onPick: (product: ProductRef) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-brand"
      >
        <Link2 className="h-4 w-4 text-brand" /> Share listing
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 max-h-64 w-72 overflow-y-auto rounded-2xl border border-border bg-card p-2 shadow-xl">
          <div className="mb-1 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
            Choose a listing
          </div>
          {allProducts.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onPick({
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  image: item.image,
                  seller: item.seller,
                });
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-accent"
            >
              <span className="text-xl">{item.image}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold">{item.name}</span>
                <span className="block text-[10px] font-black text-brand">
                  ₦{item.price.toLocaleString()}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read image"));
    reader.readAsDataURL(file);
  });
}

function MessageNotFound() {
  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
      <Search className="h-7 w-7" />
    </div>
  );
}
function MessageCircleIcon() {
  return (
    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-brand/10 text-brand">
      <Send className="h-5 w-5" />
    </div>
  );
}

function groupByDay(messages: Message[]) {
  const groups: { day: string; messages: Message[] }[] = [];
  for (const message of messages) {
    const date = new Date(message.createdAt);
    const day = isToday(date)
      ? "Today"
      : isYesterday(date)
        ? "Yesterday"
        : date.toLocaleDateString();
    const last = groups[groups.length - 1];
    if (last?.day === day) last.messages.push(message);
    else groups.push({ day, messages: [message] });
  }
  return groups;
}
function isToday(date: Date) {
  return date.toDateString() === new Date().toDateString();
}
function isYesterday(date: Date) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
}
