import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { getProfileRepository } from "@/lib/profile-repository";
import { useProfileSnapshot } from "@/lib/use-profile-snapshot";
import { ArrowLeft, CheckCircle2, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/edit-ad/$id")({ component: EditAd });

type Draft = { title: string; price: string; region: string; status: string };

function EditAd() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { status, data, refresh } = useProfileSnapshot();
  const ad = data?.ads.find((entry) => entry.listingId === id);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (ad)
      setDraft({ title: ad.title, price: String(ad.price), region: ad.region, status: ad.status });
  }, [ad]);

  const save = async () => {
    if (!draft || !ad || !draft.title.trim() || Number(draft.price) <= 0 || !draft.region.trim())
      return;
    setSaving(true);
    setNotice(null);
    try {
      const repository = await getProfileRepository();
      if (repository.mode === "preview") {
        await repository.updatePreview((state) => {
          const target = state.ads.find((entry) => entry.listingId === id);
          if (!target) throw new Error("Advert no longer exists.");
          target.title = draft.title.trim();
          target.price = Number(draft.price);
          target.region = draft.region.trim();
          target.status = draft.status;
          target.updatedAt = new Date().toISOString();
          state.activity.unshift({
            id: `act_${Date.now()}`,
            type: "ad_updated",
            title: "Advert updated",
            detail: `${target.title} was edited in preview.`,
            occurredAt: target.updatedAt,
          });
        });
        await refresh();
        setNotice("Advert changes saved in development preview.");
        setTimeout(
          () => navigate({ to: "/profile-center/$section", params: { section: "ads" } }),
          500,
        );
      } else {
        setNotice("Production ad editing is prepared for the Listings API update endpoint.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save this advert.");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading")
    return (
      <AppShell title="Edit ad">
        <div className="h-80 animate-pulse rounded-2xl bg-muted" />
      </AppShell>
    );
  if (!ad || !draft)
    return (
      <AppShell title="Edit ad">
        <section className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="font-bold">This advert was not found.</p>
          <Link
            to="/profile-center/$section"
            params={{ section: "ads" }}
            className="mt-4 inline-flex rounded-lg bg-brand px-3 py-2 text-xs font-bold text-brand-foreground"
          >
            Back to My ads
          </Link>
        </section>
      </AppShell>
    );

  return (
    <AppShell title="Edit ad">
      <div className="space-y-4 pb-6">
        <Link
          to="/profile-center/$section"
          params={{ section: "ads" }}
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to My ads
        </Link>
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <h1 className="text-lg font-black">Edit advert</h1>
          <Field
            label="Title"
            value={draft.title}
            onChange={(value) => setDraft({ ...draft, title: value })}
          />
          <Field
            label="Price (₦)"
            value={draft.price}
            type="number"
            onChange={(value) => setDraft({ ...draft, price: value })}
          />
          <Field
            label="Location"
            value={draft.region}
            onChange={(value) => setDraft({ ...draft, region: value })}
          />
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Listing status</span>
            <select
              value={draft.status}
              onChange={(event) => setDraft({ ...draft, status: event.target.value })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="DRAFT">Draft</option>
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="EXPIRED">Expired</option>
              <option value="REJECTED">Rejected</option>
              <option value="CLOSED">Closed</option>
            </select>
          </label>
        </section>
        {notice && (
          <p className="rounded-xl bg-brand/5 px-3 py-2 text-xs font-semibold text-brand">
            {notice}
          </p>
        )}
        <button
          disabled={saving}
          onClick={() => void save()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-brand-foreground disabled:opacity-50"
        >
          {saving ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {saving ? "Saving…" : "Save advert"}
        </button>
      </div>
    </AppShell>
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
