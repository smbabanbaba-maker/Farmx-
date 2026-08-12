import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronRight,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PayModal } from "@/components/PayModal";
import { LOCATIONS, PRODUCT_CATEGORIES, PRICING } from "@/lib/mock-data";
import { useLocation } from "@/lib/location";
import { publishListing } from "@/lib/listing.functions";
import type { PaymentPurpose } from "@/lib/paystack";
import { uploadFileToS3 } from "@/lib/s3-client";
import { useCommerce } from "@/lib/commerce-store";
import { useSubscription } from "@/lib/subscription";

export const Route = createFileRoute("/post-product")({ component: PostProduct });

const CATEGORIES = PRODUCT_CATEGORIES;

const TYPES = ["New", "Fairly Used", "Second-hand", "Made to Order"] as const;
const CONDITIONS = ["Excellent", "Good", "Fair"] as const;
const DELIVERY = ["Pickup", "Courier", "Seller delivery", "Pay on delivery"] as const;
const NEGOTIATION = ["Yes", "No", "Not sure"] as const;
const PROMOS = [
  {
    id: "none",
    label: "No promo",
    price: 0,
    days: 0,
    sub: "Free — standard marketplace visibility",
  },
  {
    id: "basic",
    label: "Basic Boost",
    price: PRICING.promoWeek,
    days: 7,
    sub: "Top of search for 7 days",
  },
  {
    id: "top",
    label: "TOP Promo",
    price: PRICING.promoTop,
    days: 7,
    sub: "Top spot + 15× traffic for 7 days",
  },
  {
    id: "premium",
    label: "Premium Boost",
    price: PRICING.promoMonth,
    days: 30,
    sub: "Top spot + badge + 30× traffic",
  },
] as const;

const MIN_TITLE = 10;
const MAX_TITLE = 70;
const MAX_DESC = 850;
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_PHOTOS = 5;
const ACCEPT = "image/jpeg,image/png,image/heic,image/webp";

type Photo = {
  url: string;
  name: string;
  objectKey?: string;
  uploading?: boolean;
  error?: string;
};

function PostProduct() {
  const navigate = useNavigate();
  const { location } = useLocation();
  const { canPost, consumeListing, listingsLeft } = useSubscription();
  const { addPromo } = useCommerce();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("");
  const [brand, setBrand] = useState("");
  const [details, setDetails] = useState({
    make: "",
    color: "",
    transmission: "",
    powertrain: "",
    fuel: "",
    drivetrain: "",
    seats: "",
    cylinders: "",
    engineSize: "",
    horsepower: "",
    exchange: "",
    registered: "",
  });
  const [photos, setPhotos] = useState<Photo[]>([]);
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
  const [isPublishing, setIsPublishing] = useState(false);

  const activePromo = PROMOS.find((item) => item.id === promo)!;
  const brandHint =
    category === "Cars"
      ? "e.g. Toyota, Honda"
      : category === "Electronics"
        ? "e.g. Samsung, Apple"
        : "Optional — brand or producer";

  const onPickFiles = async (files: FileList | null) => {
    if (!files) return;
    setError(null);

    const incoming = Array.from(files);
    if (photos.length + incoming.length > MAX_PHOTOS) {
      setError(`Za ka iya saka hotuna ${MAX_PHOTOS} kawai.`);
      return;
    }

    const accepted: File[] = [];
    for (const file of incoming) {
      if (file.size > MAX_SIZE) {
        setError(`${file.name} ya wuce 5MB.`);
        return;
      }
      if (!["image/jpeg", "image/png", "image/heic", "image/webp"].includes(file.type)) {
        setError(`Ba a yarda da format ɗin ${file.name} ba.`);
        return;
      }
      accepted.push(file);
    }

    const start = photos.length;
    setPhotos((current) => [
      ...current,
      ...accepted.map((file) => ({
        url: URL.createObjectURL(file),
        name: file.name,
        uploading: true,
      })),
    ]);

    await Promise.all(
      accepted.map(async (file, offset) => {
        const index = start + offset;
        try {
          const { objectKey } = await uploadFileToS3("products", file);
          setPhotos((current) =>
            current.map((photo, position) =>
              position === index ? { ...photo, objectKey, uploading: false } : photo,
            ),
          );
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : "Upload failed";
          setPhotos((current) =>
            current.map((photo, position) =>
              position === index ? { ...photo, uploading: false, error: message } : photo,
            ),
          );
          setError(`An kasa loda ${file.name}: ${message}`);
        }
      }),
    );
  };

  const toggleDelivery = (item: string) => {
    setDelivery((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
    );
  };

  const validate = () => {
    if (title.trim().length < MIN_TITLE) return `Take yana buƙatar aƙalla haruffa ${MIN_TITLE}.`;
    if (!category) return "Zaɓi category.";
    if (photos.length < MAX_PHOTOS)
      return `Saka hotuna ${MAX_PHOTOS} domin tallar ta samu ingantacciyar bayyana.`;
    if (photos.some((photo) => photo.uploading)) return "Ana loda hotuna zuwa AWS S3; jira kaɗan.";
    if (photos.some((photo) => !photo.objectKey))
      return "Wasu hotuna ba a loda su ba. Da fatan a sake gwadawa.";
    if (!region) return "Zaɓi region.";
    if (!type) return "Zaɓi type.";
    if (!condition) return "Zaɓi condition.";
    if (!description.trim()) return "Rubuta bayanin kaya.";
    if (!price || Number(price) <= 0) return "Sanya farashi.";
    if (delivery.length === 0) return "Zaɓi aƙalla hanyar delivery guda ɗaya.";
    if (contactName.trim().length < 2) return "Sanya cikakken suna.";
    if (!/^\d{7,15}$/.test(phone)) return "Lambar waya ta kasance lambobi 7 zuwa 15.";
    if (videoLink && !/^https?:\/\//i.test(videoLink))
      return "Video link ya fara da http:// ko https://.";
    return null;
  };

  const persistListing = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return false;
    }

    setError(null);
    setIsPublishing(true);
    try {
      await publishListing({
        data: {
          title: title.trim(),
          category,
          brand: brand.trim() || undefined,
          photos: photos.map((photo) => photo.objectKey!).filter(Boolean),
          videoLink: videoLink.trim(),
          region,
          type,
          condition,
          description: `${description.trim()}\n\nDetails: ${Object.entries(details)
            .filter(([, value]) => value)
            .map(([key, value]) => `${key}: ${value}`)
            .join(" · ")}`,
          price: Number(price),
          bulkPrice: bulkPrice ? Number(bulkPrice) : undefined,
          negotiation: negotiation as "Yes" | "No" | "Not sure",
          delivery,
          contactName: contactName.trim(),
          phone,
          promoDays: activePromo.days as 0 | 7 | 30,
          sellerId: "farmx-demo-user",
        },
      });
      consumeListing();
      if (activePromo.days) addPromo(title.trim(), String(activePromo.days) as "7" | "30");
      setPay(null);
      setDone(true);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "An kasa wallafa tallar. A sake gwadawa.");
      return false;
    } finally {
      setIsPublishing(false);
    }
  };

  const submit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!canPost) {
      navigate({ to: "/subscribe" });
      return;
    }
    if (!activePromo.price) {
      await persistListing();
      return;
    }
    setPay({
      title: `${activePromo.label} — ${activePromo.sub}`,
      amount: activePromo.price,
      purpose:
        activePromo.days === 30
          ? { kind: "promo_month", productId: "new" }
          : { kind: "promo_week", productId: "new" },
    });
  };

  if (done) {
    return (
      <AppShell title="An wallafa">
        <div className="flex flex-col items-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
            <Check className="h-8 w-8 text-brand" />
          </div>
          <h2 className="text-lg font-bold">Tallarka ta shiga kasuwa</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            An adana bayanan tallar cikin aminci.
          </p>
          <p className="mt-3 text-sm font-semibold text-brand">
            {`Kana da tallace-tallace ${listingsLeft} da suka rage a wannan lokaci.`}
          </p>
          <button
            onClick={() => navigate({ to: "/market" })}
            className="mt-7 rounded-xl bg-brand px-5 py-3 font-semibold text-brand-foreground"
          >
            Buɗe kasuwa
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Wallafa talla">
      <div className="space-y-4 pb-8">
        <p className="rounded-xl border border-brand/20 bg-brand/5 px-3 py-2 text-xs text-muted-foreground">
          Ba a cajin kuɗin wallafa. Kana da {`${listingsLeft} tallace-tallace suka rage`} a tsarin
          yanzu.
        </p>

        <Field label="Title" hint={`${title.length}/${MAX_TITLE} · min ${MIN_TITLE}`}>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value.slice(0, MAX_TITLE))}
            placeholder="Misali: Injin ban ruwa mai kyau"
            className="input-control"
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Category">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="input-control"
            >
              <option value="">— Zaɓi category —</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Brand" hint={brandHint}>
            <input
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              placeholder="Brand"
              className="input-control"
            />
          </Field>
        </div>

        <Field
          label="Photos"
          hint={`Aƙalla ${MAX_PHOTOS} · Matsakaicin ${MAX_PHOTOS} · JPG, PNG, HEIC, WEBP · 5MB/hoto`}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(event) => void onPickFiles(event.target.files)}
          />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {photos.map((photo, index) => (
              <div
                key={`${photo.name}-${index}`}
                className="relative aspect-square overflow-hidden rounded-xl border border-border"
              >
                <img
                  src={photo.url}
                  alt={`Hoto ${index + 1} na tallar`}
                  className="h-full w-full object-cover"
                />
                {index === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-brand px-1.5 py-0.5 text-[8px] font-bold text-brand-foreground">
                    BABBA
                  </span>
                )}
                {photo.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
                )}
                {photo.error && (
                  <span className="absolute inset-x-0 bottom-0 bg-brand px-1 py-1 text-[8px] text-white">
                    Upload ya kasa
                  </span>
                )}
                <div className="absolute right-1 top-1 flex gap-1">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPhotos((current) => {
                          const next = [...current];
                          [next[index - 1], next[index]] = [next[index], next[index - 1]];
                          return next;
                        })
                      }
                      className="rounded-full bg-black/65 p-1 text-white"
                      aria-label="Matsar da hoto baya"
                    >
                      <ArrowLeft className="h-3 w-3" />
                    </button>
                  )}
                  {index < photos.length - 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPhotos((current) => {
                          const next = [...current];
                          [next[index + 1], next[index]] = [next[index], next[index + 1]];
                          return next;
                        })
                      }
                      className="rounded-full bg-black/65 p-1 text-white"
                      aria-label="Matsar da hoto gaba"
                    >
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setPhotos((current) => current.filter((_, position) => position !== index))
                    }
                    className="rounded-full bg-black/65 p-1 text-white"
                    aria-label="Cire hoto"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:border-brand hover:text-brand"
              >
                <Camera className="h-5 w-5" />
                <span className="mt-1 text-[10px]">Ƙara hoto</span>
              </button>
            )}
          </div>
        </Field>

        <Field label="Video link" hint="Optional — YouTube, Facebook, TikTok">
          <input
            value={videoLink}
            onChange={(event) => setVideoLink(event.target.value)}
            placeholder="https://..."
            className="input-control"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Region">
            <select
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              className="input-control"
            >
              {LOCATIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="input-control"
            >
              <option value="">— Zaɓi —</option>
              {TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Condition">
          <select
            value={condition}
            onChange={(event) => setCondition(event.target.value)}
            className="input-control"
          >
            <option value="">— Zaɓi condition —</option>
            {CONDITIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
        {(category === "Cars" ||
          category === "Vehicle Parts" ||
          category === "Commercial Equipment") && (
          <section className="space-y-3 rounded-2xl border border-border bg-card p-3">
            <div>
              <p className="text-sm font-bold">Item details</p>
              <p className="text-[11px] text-muted-foreground">
                Add specifications relevant to this category.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DetailField
                label="Make"
                value={details.make}
                onChange={(value) => setDetails((current) => ({ ...current, make: value }))}
              />
              <DetailField
                label="Color"
                value={details.color}
                onChange={(value) => setDetails((current) => ({ ...current, color: value }))}
              />
              <DetailSelect
                label="Transmission"
                value={details.transmission}
                options={["Automatic", "Manual"]}
                onChange={(value) => setDetails((current) => ({ ...current, transmission: value }))}
              />
              <DetailField
                label="Powertrain"
                value={details.powertrain}
                onChange={(value) => setDetails((current) => ({ ...current, powertrain: value }))}
              />
              <DetailField
                label="Fuel"
                value={details.fuel}
                onChange={(value) => setDetails((current) => ({ ...current, fuel: value }))}
              />
              <DetailField
                label="Drivetrain"
                value={details.drivetrain}
                onChange={(value) => setDetails((current) => ({ ...current, drivetrain: value }))}
              />
              <DetailField
                label="Seats"
                value={details.seats}
                onChange={(value) => setDetails((current) => ({ ...current, seats: value }))}
              />
              <DetailField
                label="Cylinders"
                value={details.cylinders}
                onChange={(value) => setDetails((current) => ({ ...current, cylinders: value }))}
              />
              <DetailField
                label="Engine size"
                value={details.engineSize}
                onChange={(value) => setDetails((current) => ({ ...current, engineSize: value }))}
              />
              <DetailField
                label="Horsepower"
                value={details.horsepower}
                onChange={(value) => setDetails((current) => ({ ...current, horsepower: value }))}
              />
              <DetailSelect
                label="Exchange possible"
                value={details.exchange}
                options={["Yes", "No"]}
                onChange={(value) => setDetails((current) => ({ ...current, exchange: value }))}
              />
              <DetailSelect
                label="Registered"
                value={details.registered}
                options={["Yes", "No"]}
                onChange={(value) => setDetails((current) => ({ ...current, registered: value }))}
              />
            </div>
          </section>
        )}

        <Field label="Description" hint={`${description.length}/${MAX_DESC}`}>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value.slice(0, MAX_DESC))}
            rows={5}
            placeholder="Cikakken bayani game da kaya, yanayinsa da anfani."
            className="input-control resize-none"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (₦)">
            <input
              inputMode="numeric"
              value={price}
              onChange={(event) => setPrice(event.target.value.replace(/\D/g, ""))}
              placeholder="0"
              className="input-control"
            />
          </Field>
          <Field label="Bulk price (₦)" hint="Optional">
            <input
              inputMode="numeric"
              value={bulkPrice}
              onChange={(event) => setBulkPrice(event.target.value.replace(/\D/g, ""))}
              placeholder="0"
              className="input-control"
            />
          </Field>
        </div>

        <Field label="Negotiation">
          <div className="grid grid-cols-3 gap-2">
            {NEGOTIATION.map((item) => (
              <Choice key={item} active={negotiation === item} onClick={() => setNegotiation(item)}>
                {item}
              </Choice>
            ))}
          </div>
        </Field>
        <Field label="Delivery">
          <div className="flex flex-wrap gap-2">
            {DELIVERY.map((item) => (
              <Choice
                key={item}
                active={delivery.includes(item)}
                onClick={() => toggleDelivery(item)}
              >
                {item}
              </Choice>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <input
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              placeholder="Cikakken suna"
              className="input-control"
            />
          </Field>
          <Field label="Phone number">
            <input
              inputMode="numeric"
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
              placeholder="08012345678"
              className="input-control"
            />
          </Field>
        </div>

        <Field label="Promotion">
          <div className="space-y-2">
            {PROMOS.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setPromo(item.id)}
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors ${promo === item.id ? "border-brand bg-brand/5" : "border-border hover:border-brand/50"}`}
              >
                <div className="flex items-center gap-2">
                  {item.days > 0 && <Sparkles className="h-4 w-4 text-brand" />}
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.sub}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-brand">
                  {item.price ? `₦${item.price.toLocaleString()}` : "Free"}
                </span>
              </button>
            ))}
          </div>
        </Field>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-brand/10 px-3 py-2 text-xs font-medium text-brand"
          >
            {error}
          </p>
        )}
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Ta hanyar wallafa wannan talla, ka amince da ƙa’idodin amfani da tsarin sirri na FarmX.
        </p>

        <div className="sticky bottom-20 pt-2 sm:bottom-4">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={isPublishing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-bold text-brand-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            {isPublishing
              ? "Ana wallafawa..."
              : activePromo.price
                ? `Wallafa + ₦${activePromo.price.toLocaleString()}`
                : "Wallafa talla kyauta"}
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
          void persistListing();
        }}
      />
    </AppShell>
  );
}

function DetailField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-[11px] font-semibold text-muted-foreground">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full input-control"
      />
    </label>
  );
}

function DetailSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-[11px] font-semibold text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full input-control"
      >
        <option value="">— Select —</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
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
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label className="text-xs font-semibold text-foreground">{label}</label>
        {hint && <span className="text-right text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Choice({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${active ? "border-brand bg-brand/10 text-brand" : "border-border hover:border-brand/50"}`}
    >
      {children}
    </button>
  );
}
