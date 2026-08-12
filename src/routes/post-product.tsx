import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { PayModal } from "@/components/PayModal";
import { PRICING, LOCATIONS } from "@/lib/mock-data";
import { useLocation } from "@/lib/location";
import type { PaymentPurpose } from "@/lib/paystack";
import { uploadFileToS3 } from "@/lib/s3-client";
import { useSubscription } from "@/lib/subscription";
import { useCommerce } from "@/lib/commerce-store";
import { Camera, X, Upload, Check, ChevronRight, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/post-product")({ component: PostProduct });

const CATEGORIES = [
  "Crops & Grains",
  "Vegetables & Fruits",
  "Livestock & Poultry",
  "Farm Machinery",
  "Fertilizers & Chemicals",
  "Seeds & Seedlings",
  "Printing & Graphics Equipment",
  "Storage & Packaging",
  "Feeds & Supplements",
  "Other",
] as const;

const TYPES = ["Sabo (New)", "Fairly Used", "Second-hand"] as const;
const CONDITIONS = ["Excellent", "Good", "Fair"] as const;
const DELIVERY = ["Pickup", "Courier", "Farm delivery"] as const;
const NEGOTIATION = ["Yes", "No", "Not sure"] as const;
const PROMOS = [
  { id: "none", label: "No Promo", price: 0, sub: "Free — normal search" },
  { id: "top", label: "TOP Promo", price: PRICING.promoTop, sub: "7 days visibility boost" },
  { id: "premium", label: "TOP Promo", price: PRICING.promoTop, sub: "30 days visibility boost" },
] as const;

const MAX_TITLE = 70;
const MAX_DESC = 850;
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/heic,image/webp";

function PostProduct() {
  const navigate = useNavigate();
  const { location } = useLocation();
  const { canPost, consumeListing, listingsLeft } = useSubscription();
  const { addPromo } = useCommerce();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("");
  const [photos, setPhotos] = useState<
    { url: string; name: string; objectKey?: string; uploading?: boolean; error?: string }[]
  >([]);
  const [videoLink, setVideoLink] = useState("");
  const [region, setRegion] = useState<string>(location);
  const [type, setType] = useState<string>("");
  const [condition, setCondition] = useState<string>("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [bulkPrice, setBulkPrice] = useState("");
  const [negotiation, setNegotiation] = useState<string>("Not sure");
  const [delivery, setDelivery] = useState<string[]>([]);
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [promo, setPromo] = useState<(typeof PROMOS)[number]["id"]>("none");
  const [error, setError] = useState<string | null>(null);
  const [pay, setPay] = useState<{ title: string; amount: number; purpose: PaymentPurpose } | null>(
    null,
  );
  const [done, setDone] = useState(false);
  const [quotaMsg, setQuotaMsg] = useState(false);

  const onPickFiles = async (files: FileList | null) => {
    if (!files) return;
    setError(null);
    const accepted: File[] = [];
    Array.from(files).forEach((f) => {
      if (f.size > MAX_SIZE) {
        setError(`${f.name} ya wuce 5MB.`);
        return;
      }
      if (!/jpeg|jpg|png|heic|webp/i.test(f.type + f.name)) {
        setError(`Format ba a yarda ba: ${f.name}`);
        return;
      }
      accepted.push(f);
    });
    // Insert placeholders with local previews
    const start = photos.length;
    const placeholders = accepted.map((f) => ({
      url: URL.createObjectURL(f),
      name: f.name,
      uploading: true,
    }));
    const next = [...photos, ...placeholders].slice(0, 8);
    setPhotos(next);
    // Upload each to S3 in parallel
    await Promise.all(
      accepted.slice(0, 8 - start).map(async (f, i) => {
        const idx = start + i;
        try {
          const { objectKey } = await uploadFileToS3("products", f);
          setPhotos((prev) =>
            prev.map((p, x) => (x === idx ? { ...p, objectKey, uploading: false } : p)),
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Upload failed";
          setPhotos((prev) =>
            prev.map((p, x) => (x === idx ? { ...p, uploading: false, error: msg } : p)),
          );
          setError(`Upload ya kasa: ${f.name} — ${msg}`);
        }
      }),
    );
  };

  const toggleDelivery = (d: string) =>
    setDelivery((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const validate = () => {
    if (!title.trim()) return "Ka rubuta take.";
    if (title.length > MAX_TITLE) return `Take ya wuce ${MAX_TITLE} characters.`;
    if (!category) return "Zaɓi category.";
    if (photos.length < 1) return "Saka aƙalla hoto 1.";
    if (photos.some((p) => p.uploading)) return "Ana loda hotuna zuwa AWS S3, jira kaɗan…";
    if (photos.some((p) => !p.objectKey)) return "Wasu hotuna ba a loda su ba, ka sake gwada.";
    if (!region) return "Zaɓi region.";
    if (!type) return "Zaɓi type.";
    if (!condition) return "Zaɓi condition.";
    if (!description.trim()) return "Rubuta description.";
    if (description.length > MAX_DESC) return `Description ya wuce ${MAX_DESC} characters.`;
    if (!price || Number(price) <= 0) return "Sanya price.";
    if (delivery.length === 0) return "Zaɓi aƙalla hanyar delivery 1.";
    if (!contactName.trim()) return "Sanya sunanka.";
    if (!/^\d{7,15}$/.test(phone)) return "Phone number: digits kawai (7-15).";
    return null;
  };

  const submit = () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    if (!canPost) {
      setError("Free quota ya ƙare. Sayi subscription don ci gaba da posting.");
      navigate({ to: "/subscribe" });
      return;
    }
    setError(null);
    const promoTier = PROMOS.find((p) => p.id === promo)!;
    // No listing fee — posting is covered by the free quota or the subscription.
    if (promoTier.price === 0) {
      consumeListing();
      setQuotaMsg(true);
      setDone(true);
      return;
    }
    const purpose: PaymentPurpose =
      promo === "premium"
        ? { kind: "promo_month", productId: "new" }
        : { kind: "promo_week", productId: "new" };
    setPay({
      title: `${promoTier.label} — ${promoTier.sub}`,
      amount: promoTier.price,
      purpose,
    });
  };

  if (done) {
    return (
      <AppShell title="Posted">
        <div className="flex flex-col items-center text-center py-10">
          <div className="h-16 w-16 rounded-full bg-brand/10 flex items-center justify-center mb-3">
            <Check className="h-8 w-8 text-brand" />
          </div>
          <h2 className="font-bold text-lg">Kaya ya shiga Market!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Zai bayyana a dashboard da market kai tsaye.
          </p>
          {quotaMsg && (
            <p className="mt-2 text-sm font-semibold text-brand">
              {listingsLeft === "unlimited"
                ? "Unlimited listings"
                : `You have ${listingsLeft} free ads left`}
            </p>
          )}
          <button
            onClick={() => navigate({ to: "/market" })}
            className="mt-6 px-5 py-2.5 rounded-xl bg-brand text-brand-foreground font-semibold"
          >
            Go to Market
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Post Product">
      <div className="space-y-4 pb-8">
        {/* Title */}
        <Field label="Title" hint={`${title.length}/${MAX_TITLE}`}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
            placeholder="misali: Printing Machine Sabon"
            className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm"
          />
        </Field>

        {/* Category */}
        <Field label="Category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm"
          >
            <option value="">— Zaɓi category —</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        {/* Photos */}
        <Field label="Photos" hint="Akalla 1 · Max 5MB · Hoto na farko = title picture">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => onPickFiles(e.target.files)}
          />
          <div className="grid grid-cols-4 gap-2">
            {photos.map((p, i) => (
              <div
                key={i}
                className="relative aspect-square rounded-lg overflow-hidden border border-border"
              >
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute top-1 left-1 text-[8px] px-1 py-0.5 rounded bg-brand text-brand-foreground font-bold">
                    MAIN
                  </span>
                )}
                {p.uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  </div>
                )}
                {p.error && (
                  <div className="absolute inset-x-0 bottom-0 bg-red-600/80 text-white text-[8px] px-1 py-0.5 truncate">
                    S3 fail
                  </div>
                )}
                {!p.uploading && p.objectKey && (
                  <span className="absolute bottom-1 left-1 text-[8px] px-1 py-0.5 rounded bg-green-600 text-white font-bold">
                    S3
                  </span>
                )}
                <button
                  onClick={() => setPhotos(photos.filter((_, x) => x !== i))}
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {photos.length < 8 && (
              <button
                onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-brand hover:text-brand"
              >
                <Camera className="h-5 w-5" />
                <span className="text-[10px] mt-1">Add</span>
              </button>
            )}
          </div>
        </Field>

        {/* Video */}
        <Field label="Video Link" hint="Optional — YouTube ko Facebook">
          <input
            value={videoLink}
            onChange={(e) => setVideoLink(e.target.value)}
            placeholder="https://youtube.com/..."
            className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm"
          />
        </Field>

        {/* Region */}
        <Field label="Region">
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm"
          >
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Field>

        {/* Type & Condition */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm"
            >
              <option value="">—</option>
              {TYPES.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Condition">
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm"
            >
              <option value="">—</option>
              {CONDITIONS.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Description */}
        <Field label="Description" hint={`${description.length}/${MAX_DESC}`}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
            rows={4}
            placeholder="Cikakken bayani game da kaya…"
            className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm resize-none"
          />
        </Field>

        {/* Price */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (₦)">
            <input
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm"
            />
          </Field>
          <Field label="Bulk Price (₦)" hint="Optional">
            <input
              inputMode="numeric"
              value={bulkPrice}
              onChange={(e) => setBulkPrice(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm"
            />
          </Field>
        </div>

        <Field label="Negotiation">
          <div className="flex gap-2">
            {NEGOTIATION.map((n) => (
              <button
                key={n}
                onClick={() => setNegotiation(n)}
                className={`flex-1 py-2 rounded-xl border text-xs font-semibold ${negotiation === n ? "border-brand bg-brand/10 text-brand" : "border-border"}`}
              >
                {n}
              </button>
            ))}
          </div>
        </Field>

        {/* Delivery */}
        <Field label="Delivery Options">
          <div className="flex flex-wrap gap-2">
            {DELIVERY.map((d) => (
              <button
                key={d}
                onClick={() => toggleDelivery(d)}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold ${delivery.includes(d) ? "border-brand bg-brand/10 text-brand" : "border-border"}`}
              >
                {d}
              </button>
            ))}
          </div>
        </Field>

        {/* Contact */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contact Name">
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="misali: Baban Baba"
              className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm"
            />
          </Field>
          <Field label="Phone">
            <input
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="08012345678"
              className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm"
            />
          </Field>
        </div>

        {/* Promo */}
        <Field label="Promo Options">
          <div className="space-y-2">
            {PROMOS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPromo(p.id)}
                className={`w-full p-3 rounded-xl border flex items-center justify-between ${promo === p.id ? "border-brand bg-brand/5" : "border-border"}`}
              >
                <div className="text-left flex items-center gap-2">
                  {p.id !== "none" && <Sparkles className="h-4 w-4 text-brand" />}
                  <div>
                    <p className="text-sm font-semibold">{p.label}</p>
                    <p className="text-[11px] text-muted-foreground">{p.sub}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-brand">
                  {p.price ? `₦${p.price.toLocaleString()}` : "Free"}
                </span>
              </button>
            ))}
          </div>
        </Field>

        {error && <p className="text-xs text-brand font-semibold">{error}</p>}

        <p className="text-[10px] text-muted-foreground">
          By posting this ad you accept the FarmX Terms of Use and Privacy Policy.
        </p>

        <div className="sticky bottom-20 sm:bottom-4 pt-2">
          <button
            onClick={submit}
            className="w-full py-3 rounded-xl bg-brand text-brand-foreground font-bold flex items-center justify-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {(() => {
              const pr = PROMOS.find((p) => p.id === promo)?.price ?? 0;
              return pr
                ? `Post · ₦${pr.toLocaleString()}`
                : `Post ad · Free${listingsLeft === "unlimited" ? "" : ` (${listingsLeft} left)`}`;
            })()}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <PayModal
        open={!!pay}
        onClose={() => setPay(null)}
        title={pay?.title ?? ""}
        amountNaira={pay?.amount ?? 0}
        purpose={pay?.purpose ?? { kind: "promo_week", productId: "new" }}
        onPaid={() => {
          consumeListing();
          if (promo !== "none") addPromo(title || "Your ad", promo === "premium" ? "30" : "7");
          setPay(null);
          setQuotaMsg(true);
          setDone(true);
        }}
      />
    </AppShell>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-xs font-semibold text-foreground">{label}</label>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
