import { Link } from "@tanstack/react-router";
import { getProfileRepository } from "@/lib/profile-repository";
import type { useProfileSnapshot } from "@/lib/use-profile-snapshot";
import {
  BadgeCheck,
  BriefcaseBusiness,
  FileUp,
  Flag,
  History,
  MessageSquareText,
  ShieldAlert,
  ShieldCheck,
  Star,
  TicketCheck,
  UserMinus,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

type SnapshotHook = ReturnType<typeof useProfileSnapshot>;
type SupportedSection = "reviews" | "verification" | "business" | "safety" | "support" | "activity";

export function ProfileTrustPanels({
  section,
  snapshot,
}: {
  section: SupportedSection;
  snapshot: SnapshotHook;
}) {
  if (snapshot.status === "loading")
    return <div className="h-56 animate-pulse rounded-2xl bg-muted" />;
  if (snapshot.status === "error" || !snapshot.data)
    return (
      <Retry message={snapshot.error ?? "Unable to load Profile data."} retry={snapshot.refresh} />
    );
  if (section === "reviews") return <Reviews snapshot={snapshot} />;
  if (section === "verification") return <Verification snapshot={snapshot} />;
  if (section === "business") return <Business snapshot={snapshot} />;
  if (section === "safety") return <Safety snapshot={snapshot} />;
  if (section === "support") return <Support snapshot={snapshot} />;
  return <Activity snapshot={snapshot} />;
}

function Reviews({ snapshot }: { snapshot: SnapshotHook }) {
  const data = snapshot.data!;
  const [tab, setTab] = useState<"received" | "given">("received");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const reviews = data.reviews.filter((review) => review.direction === tab);
  const received = data.reviews.filter((review) => review.direction === "received");
  const average = received.length
    ? (received.reduce((sum, review) => sum + review.rating, 0) / received.length).toFixed(1)
    : "—";
  const sendReply = async () => {
    if (!replyTo || !reply.trim()) return;
    const repository = await getProfileRepository();
    await repository.updatePreview((state) => {
      const target = state.reviews.find((review) => review.id === replyTo);
      if (target) target.reply = reply.trim();
    });
    await snapshot.refresh();
    setReply("");
    setReplyTo(null);
    setNotice("Reply added in development preview.");
  };
  return (
    <section className="space-y-3">
      {notice && <Notice text={notice} />}
      <article className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-end gap-4">
          <p className="text-4xl font-black text-brand">{average}</p>
          <div>
            <div className="flex text-yellow-500">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  className={`h-4 w-4 ${index < Math.round(Number(average) || 0) ? "fill-current" : ""}`}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {received.length} verified interaction reviews
            </p>
          </div>
        </div>
      </article>
      <div className="flex gap-2">
        <button
          onClick={() => setTab("received")}
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${tab === "received" ? "bg-brand text-brand-foreground" : "border border-border bg-card"}`}
        >
          Received
        </button>
        <button
          onClick={() => setTab("given")}
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${tab === "given" ? "bg-brand text-brand-foreground" : "border border-border bg-card"}`}
        >
          Given
        </button>
      </div>
      {reviews.map((review) => (
        <article key={review.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex justify-between gap-3">
            <div>
              <p className="text-sm font-bold">{review.author}</p>
              <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-green-700">
                <BadgeCheck className="h-3 w-3" /> Verified interaction
              </p>
            </div>
            <div className="flex text-yellow-500">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  className={`h-3.5 w-3.5 ${index < review.rating ? "fill-current" : ""}`}
                />
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs leading-5">{review.comment}</p>
          {review.reply && (
            <p className="mt-3 rounded-lg bg-muted p-2 text-xs">
              <strong>Your reply:</strong> {review.reply}
            </p>
          )}
          {tab === "received" && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setReplyTo(review.id)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold"
              >
                Reply
              </button>
              <button
                onClick={() => setNotice("Review report recorded for moderation in preview.")}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold"
              >
                Report
              </button>
              <button
                onClick={() =>
                  setNotice("Appeal flow will be sent to the Trust service in production.")
                }
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold"
              >
                Appeal
              </button>
            </div>
          )}
          {replyTo === review.id && (
            <div className="mt-3 space-y-2">
              <textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                placeholder="Write a respectful reply"
              />
              <button
                onClick={() => void sendReply()}
                className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-brand-foreground"
              >
                Send reply
              </button>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}

function Verification({ snapshot }: { snapshot: SnapshotHook }) {
  const data = snapshot.data!;
  const fileRef = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const submit = async (file?: File) => {
    if (!target) return;
    const repository = await getProfileRepository();
    await repository.updatePreview((state) => {
      const item = state.verification.find((entry) => entry.key === target);
      if (item) {
        item.status = "pending";
        item.updatedAt = new Date().toISOString();
        item.documentName = file?.name ?? item.documentName;
      }
      state.activity.unshift({
        id: `act_${Date.now()}`,
        type: "verification_submitted",
        title: "Verification submitted",
        detail: `${target} verification submitted in preview.`,
        occurredAt: new Date().toISOString(),
      });
    });
    await snapshot.refresh();
    setNotice("Verification submitted for preview admin review.");
    setTarget(null);
  };
  return (
    <section className="space-y-3">
      {notice && <Notice text={notice} />}
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf"
        onChange={(event) => void submit(event.target.files?.[0])}
      />
      {data.verification.map((item) => (
        <article key={item.key} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold">{item.label}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.documentName ?? "No document uploaded"}
              </p>
            </div>
            <Status label={item.status} />
          </div>
          {item.updatedAt && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              Last updated {formatDate(item.updatedAt)}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {item.key === "phone" || item.key === "email" ? (
              <button
                onClick={() => {
                  setTarget(item.key);
                  void submit();
                }}
                className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-brand-foreground"
              >
                Verify
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setTarget(item.key);
                    fileRef.current?.click();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-brand-foreground"
                >
                  <FileUp className="h-3 w-3" /> Upload / replace
                </button>
                {item.documentName && (
                  <button
                    onClick={() =>
                      setNotice(
                        `Preview for ${item.documentName} is available after secure upload in production.`,
                      )
                    }
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold"
                  >
                    Preview
                  </button>
                )}
                <button
                  onClick={() =>
                    setNotice(
                      "Document removal is queued for the verification service in production.",
                    )
                  }
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold"
                >
                  Remove
                </button>
              </>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}

function Business({ snapshot }: { snapshot: SnapshotHook }) {
  const source = snapshot.data!.business;
  const [form, setForm] = useState(source);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const save = async () => {
    const repository = await getProfileRepository();
    await repository.updatePreview((state) => {
      state.business = { ...form, socialLinks: form.socialLinks.filter(Boolean) };
    });
    await snapshot.refresh();
    setEditing(false);
    setNotice("Business profile saved in development preview.");
  };
  return (
    <section className="space-y-3">
      {notice && <Notice text={notice} />}
      <article className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black">{form.name}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {form.category} · {form.location}
            </p>
          </div>
          <Status label={form.verificationStatus} />
        </div>
        {editing ? (
          <div className="mt-4 space-y-3">
            <Field
              label="Business name"
              value={form.name}
              onChange={(value) => setForm({ ...form, name: value })}
            />
            <Field
              label="Category"
              value={form.category}
              onChange={(value) => setForm({ ...form, category: value })}
            />
            <TextArea
              label="Description"
              value={form.description}
              onChange={(value) => setForm({ ...form, description: value })}
            />
            <Field
              label="Location"
              value={form.location}
              onChange={(value) => setForm({ ...form, location: value })}
            />
            <Field
              label="Phone"
              value={form.phone}
              onChange={(value) => setForm({ ...form, phone: value })}
            />
            <Field
              label="Email"
              value={form.email}
              onChange={(value) => setForm({ ...form, email: value })}
            />
            <Field
              label="Website"
              value={form.website}
              onChange={(value) => setForm({ ...form, website: value })}
            />
            <Field
              label="Registration information"
              value={form.registrationInfo}
              onChange={(value) => setForm({ ...form, registrationInfo: value })}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => void save()}
                className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-bold text-brand-foreground"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-4 text-sm leading-6">{form.description}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              {form.phone} · {form.email}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setEditing(true)}
                className="rounded-lg bg-brand px-3 py-2 text-xs font-bold text-brand-foreground"
              >
                Edit
              </button>
              <button
                onClick={() =>
                  void navigator.clipboard.writeText(
                    `${window.location.origin}/u/${snapshot.data!.profile.username}`,
                  )
                }
                className="rounded-lg border border-border px-3 py-2 text-xs font-bold"
              >
                Share
              </button>
              <Link
                to="/u/$username"
                params={{ username: snapshot.data!.profile.username }}
                className="rounded-lg border border-border px-3 py-2 text-xs font-bold"
              >
                Preview
              </Link>
            </div>
          </>
        )}
      </article>
    </section>
  );
}

function Safety({ snapshot }: { snapshot: SnapshotHook }) {
  const data = snapshot.data!;
  const [notice, setNotice] = useState<string | null>(null);
  const unblock = async (id: string) => {
    const repository = await getProfileRepository();
    await repository.updatePreview((state) => {
      state.safety.blockedUsers = state.safety.blockedUsers.filter((person) => person.id !== id);
    });
    await snapshot.refresh();
    setNotice("User unblocked in preview.");
  };
  return (
    <section className="space-y-3">
      {notice && <Notice text={notice} />}
      <article className="rounded-2xl border border-brand/20 bg-brand/5 p-4">
        <ShieldAlert className="h-5 w-5 text-brand" />
        <h2 className="mt-2 font-bold">Safety tips</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Keep discussions in FarmX chat, verify details independently, meet safely, and do not send
          money for products through FarmX.
        </p>
      </article>
      <article className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-bold">Reports</h2>
        {data.safety.reports.map((report) => (
          <div key={report.id} className="mt-3 flex justify-between text-xs">
            <span>{report.subject}</span>
            <Status label={report.status} />
          </div>
        ))}
        <button
          onClick={() =>
            setNotice(
              "Report user and report advert forms will use the Trust service in production.",
            )
          }
          className="mt-4 inline-flex items-center gap-1 rounded-lg border border-brand px-3 py-2 text-xs font-bold text-brand"
        >
          <Flag className="h-3 w-3" /> Create report
        </button>
      </article>
      <article className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-bold">Blocked users</h2>
        {data.safety.blockedUsers.length ? (
          data.safety.blockedUsers.map((person) => (
            <div key={person.id} className="mt-3 flex justify-between text-xs">
              <span>{person.name}</span>
              <button onClick={() => void unblock(person.id)} className="font-bold text-brand">
                Unblock
              </button>
            </div>
          ))
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">No blocked users.</p>
        )}
      </article>
    </section>
  );
}

function Support({ snapshot }: { snapshot: SnapshotHook }) {
  const data = snapshot.data!;
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const createTicket = async () => {
    if (!subject.trim() || !message.trim()) return;
    const repository = await getProfileRepository();
    await repository.updatePreview((state) => {
      state.tickets.unshift({
        id: `TKT-${Math.floor(Math.random() * 9000 + 1000)}`,
        subject: subject.trim(),
        category: "Account",
        status: "open",
        createdAt: new Date().toISOString(),
        lastReply: message.trim(),
      });
    });
    await snapshot.refresh();
    setOpen(false);
    setSubject("");
    setMessage("");
    setNotice("Support ticket created in development preview.");
  };
  return (
    <section className="space-y-3">
      {notice && <Notice text={notice} />}
      {open ? (
        <article className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <h2 className="font-bold">Create support ticket</h2>
          <Field label="Subject" value={subject} onChange={setSubject} />
          <TextArea label="How can we help?" value={message} onChange={setMessage} />
          <div className="flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              onClick={() => void createTicket()}
              className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-bold text-brand-foreground"
            >
              Create ticket
            </button>
          </div>
        </article>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-brand-foreground"
        >
          <TicketCheck className="h-4 w-4" /> Create ticket
        </button>
      )}
      <article className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-bold">My tickets</h2>
        {data.tickets.map((ticket) => (
          <div key={ticket.id} className="mt-3 rounded-xl bg-muted p-3">
            <div className="flex justify-between gap-2">
              <p className="text-sm font-bold">{ticket.subject}</p>
              <Status label={ticket.status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {ticket.id} · {ticket.category} · {formatDate(ticket.createdAt)}
            </p>
            <p className="mt-2 text-xs">{ticket.lastReply}</p>
            <button
              onClick={() =>
                setNotice(
                  "Ticket replies and attachments are prepared for the Support API in production.",
                )
              }
              className="mt-3 rounded-lg border border-border px-3 py-1.5 text-xs font-bold"
            >
              Open ticket
            </button>
          </div>
        ))}
      </article>
      <Link
        to="/faq"
        className="flex items-center justify-center rounded-xl border border-border py-3 text-sm font-bold"
      >
        Open Help Center & FAQ
      </Link>
    </section>
  );
}

function Activity({ snapshot }: { snapshot: SnapshotHook }) {
  const data = snapshot.data!;
  return (
    <section className="space-y-3">
      {data.activity.length === 0 ? (
        <Empty text="No Profile activity yet." />
      ) : (
        data.activity.map((entry) => (
          <article
            key={entry.id}
            className="flex gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <History className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold">{entry.title}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{entry.detail}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {formatDate(entry.occurredAt)}
              </p>
            </div>
          </article>
        ))
      )}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-border bg-card p-7 text-center">
      <History className="mx-auto h-8 w-8 text-brand" />
      <p className="mt-3 text-sm font-bold">{text}</p>
    </section>
  );
}
function Status({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-muted px-2 py-1 text-[9px] font-black text-muted-foreground">
      {label.replaceAll("_", " ")}
    </span>
  );
}
function Notice({ text }: { text: string }) {
  return <p className="rounded-xl bg-brand/5 px-3 py-2 text-xs font-semibold text-brand">{text}</p>;
}
function Retry({ message, retry }: { message: string; retry: () => Promise<void> }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 text-center">
      <p className="font-bold">Profile data could not load.</p>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
      <button
        onClick={() => void retry()}
        className="mt-3 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-brand-foreground"
      >
        Retry
      </button>
    </section>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
      />
    </label>
  );
}
function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <textarea
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
      />
    </label>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
