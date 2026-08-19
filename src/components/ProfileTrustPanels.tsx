import { Link } from "@tanstack/react-router";
import type { useProfileSnapshot } from "@/lib/use-profile-snapshot";
import { BadgeCheck, Building2, CircleHelp, ShieldCheck, Star } from "lucide-react";

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
  if (snapshot.status === "error" || !snapshot.data) {
    return (
      <Retry message={snapshot.error ?? "Unable to load Profile data."} retry={snapshot.refresh} />
    );
  }
  if (section === "reviews") return <ReviewsPanel snapshot={snapshot} />;
  if (section === "verification") return <VerificationPanel snapshot={snapshot} />;
  if (section === "business") return <BusinessPanel snapshot={snapshot} />;
  if (section === "safety") return <SafetyPanel />;
  if (section === "support") return <SupportPanel />;
  return <ActivityPanel snapshot={snapshot} />;
}

function ReviewsPanel({ snapshot }: { snapshot: SnapshotHook }) {
  const reviews = snapshot.data!.reviews;
  const average = reviews.length
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : "—";
  return (
    <section className="space-y-3">
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
              {reviews.length} verified reviews recorded for this account
            </p>
          </div>
        </div>
      </article>
      {reviews.length === 0 ? (
        <Empty text="No reviews have been recorded yet. Reviews appear after eligible Goall26 interactions." />
      ) : (
        reviews.map((review) => (
          <article key={review.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold">{review.author}</p>
                {review.verifiedInteraction && (
                  <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-green-700">
                    <BadgeCheck className="h-3 w-3" /> Verified interaction
                  </p>
                )}
              </div>
              <span className="text-xs font-black text-brand">{review.rating}/5</span>
            </div>
            <p className="mt-3 text-xs leading-5">{review.comment}</p>
          </article>
        ))
      )}
    </section>
  );
}

function VerificationPanel({ snapshot }: { snapshot: SnapshotHook }) {
  const profile = snapshot.data!.profile;
  return (
    <section className="space-y-3">
      <article className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand" />
          <h2 className="font-black">Verification status</h2>
        </div>
        <p className="mt-2 text-sm">
          Account status:{" "}
          <strong className="capitalize">{profile.verification.replaceAll("_", " ")}</strong>
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Verification submissions are stored in ProfileTable and reviewed through the authenticated
          Goall26 flow.
        </p>
        <Link
          to="/settings/$section"
          params={{ section: "verification" }}
          className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2.5 text-xs font-black text-brand-foreground"
        >
          Open verification
        </Link>
      </article>
    </section>
  );
}

function BusinessPanel({ snapshot }: { snapshot: SnapshotHook }) {
  const business = snapshot.data!.profile.business;
  return (
    <section className="space-y-3">
      <article className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-brand" />
          <h2 className="font-black">Business profile</h2>
        </div>
        {business ? (
          <div className="mt-3 space-y-1 text-sm">
            <p className="font-bold">{business.name}</p>
            <p className="text-muted-foreground">
              {business.description || "Business description not added."}
            </p>
            <p className="text-xs text-muted-foreground">
              {business.address || "Business address not added."}
            </p>
          </div>
        ) : (
          <Empty text="No business profile has been created yet." />
        )}
        <Link
          to="/settings/$section"
          params={{ section: "business" }}
          className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2.5 text-xs font-black text-brand-foreground"
        >
          Open business settings
        </Link>
      </article>
    </section>
  );
}

function SafetyPanel() {
  return (
    <section className="space-y-3">
      <article className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand" />
          <h2 className="font-black">Safety and reports</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Report concerns from the relevant listing, profile, or community post. Your blocked-user
          controls and safety guidance remain protected behind your account.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/settings/$section"
            params={{ section: "safety" }}
            className="rounded-xl bg-brand px-4 py-2.5 text-xs font-black text-brand-foreground"
          >
            Open safety settings
          </Link>
          <Link
            to="/faq"
            className="rounded-xl border border-border px-4 py-2.5 text-xs font-black"
          >
            Safety guidance
          </Link>
        </div>
      </article>
    </section>
  );
}

function SupportPanel() {
  return (
    <section className="space-y-3">
      <article className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <CircleHelp className="h-5 w-5 text-brand" />
          <h2 className="font-black">Help and support</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Find account, marketplace, payment, and safety guidance in the Goall26 Help Centre.
        </p>
        <Link
          to="/settings/$section"
          params={{ section: "support" }}
          className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2.5 text-xs font-black text-brand-foreground"
        >
          Open Help Centre
        </Link>
      </article>
    </section>
  );
}

function ActivityPanel({ snapshot }: { snapshot: SnapshotHook }) {
  const activity = snapshot.data!.activity;
  return (
    <section className="space-y-3">
      {activity.length === 0 ? (
        <Empty text="No activity has been recorded for this account yet." />
      ) : (
        activity.map((item) => (
          <article key={item.id} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-bold">{item.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
            <p className="mt-2 text-[10px] text-muted-foreground">
              {new Date(item.occurredAt).toLocaleString()}
            </p>
          </article>
        ))
      )}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl bg-muted px-3 py-3 text-sm text-muted-foreground">{text}</p>;
}
function Retry({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="rounded-2xl border border-brand/30 bg-brand/5 p-4 text-sm">
      <p>{message}</p>
      <button
        type="button"
        onClick={retry}
        className="mt-3 rounded-lg bg-brand px-3 py-2 text-xs font-black text-brand-foreground"
      >
        Retry
      </button>
    </div>
  );
}
