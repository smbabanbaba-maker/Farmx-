import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { getProfileRepository } from "@/lib/profile-repository";
import { useProfileSnapshot } from "@/lib/use-profile-snapshot";
import { ArrowLeft, CheckCircle2, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/edit-ad/$id")({ component: EditAd });

type Draft = {
  title: string;
  price: string;
  location: string;
  status: "ACTIVE" | "PAUSED" | "SOLD" | "UNAVAILABLE" | "CLOSED";
};

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
      setDraft({
        title: ad.title,
        price: String(ad.price),
        location: ad.region,
        status: ad.status as Draft["status"],
      });
  }, [ad]);

  const save = async () => {
    if (!draft || !ad || !draft.title.trim() || Number(draft.price) <= 0 || !draft.location.trim())
      return;
    setSaving(true);
    setNotice(null);
    try {
      const repository = await getProfileRepository();
      await repository.updateAd(id, {
        title: draft.title.trim(),
        price: Number(draft.price),
        location: draft.location.trim(),
        status: draft.status,
      });
      await refresh();
      setNotice("Advert changes saved.");
      setTimeout(
        () => navigate({ to: "/profile-center/$section", params: { section: "ads" } }),
        500,
      );
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
            value={draft.location}
            onChange={(value) => setDraft({ ...draft, location: value })}
          />
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Listing status</span>
            <select
              value={draft.status}
              onChange={(event) =>
                setDraft({ ...draft, status: event.target.value as Draft["status"] })
              }
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="SOLD">Sold</option>
              <option value="UNAVAILABLE">Unavailable</option>
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
