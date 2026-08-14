import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo, type ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { PayModal } from "@/components/PayModal";
import { PRICING } from "@/lib/mock-data";
import { NIGERIA_STATES_LGAS } from "@/lib/nigeria-locations";
import { useLocation } from "@/lib/location";
import type { PaymentPurpose } from "@/lib/paystack";
import { useSubscription } from "@/lib/subscription";
import { useCommerce } from "@/lib/commerce-store";
import { useNotifications } from "@/lib/notifications-store";
import { useCompany } from "@/lib/company-store";
import { useI18n } from "@/lib/i18n";
import {
  UNIVERSAL_CATEGORIES,
  getCategory,
  getSubcategory,
  type DynamicField,
} from "@/lib/market-categories";
import {
  getListingRepository,
  type ListingFormState,
  type ListingRepository,
} from "@/lib/listing-repository";
import {
  Camera,
  X,
  Upload,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  Video,
  MapPin,
  Phone,
  Info,
  AlertCircle,
  Eye,
  ShieldCheck,
  Trash2,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/post-product")({ component: PostProduct });

const PROMOS = [
  { id: "none", label: "No Promo", price: 0, sub: "Free — normal search" },
  { id: "top", label: "TOP Promo", price: PRICING.promoTop, sub: "7 days visibility boost" },
  {
    id: "premium",
    label: "Premium Promo",
    price: PRICING.promoTop * 3,
    sub: "28 days visibility boost",
  },
] as const;

const PRICE_UNITS_BY_CATEGORY: Record<string, string[]> = {
  "agriculture-food": ["per kg", "per bag", "per tonne", "per basket", "per crate", "per item"],
  vehicles: ["per vehicle"],
  property: ["per year", "per month", "per plot", "per acre"],
  services: ["per service", "per hour", "per day", "per month", "request quote"],
  jobs: ["per month", "per year", "request quote"],
  "animals-pets": ["per animal", "per batch", "per kg"],
  "solar-energy": ["per item", "per system", "per watt", "per service"],
};

const DEFAULT_PRICE_UNITS = [
  "per item",
  "per kg",
  "per bag",
  "per animal",
  "per service",
  "per hour",
  "per day",
  "per month",
  "per year",
  "request quote",
];

const NIGERIA_STATES = Object.keys(NIGERIA_STATES_LGAS).sort();
const POST_STEPS = ["details", "media", "location", "publish"] as const;

function PostProduct() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { location: currentLoc } = useLocation();
  const { canPost, consumeListing } = useSubscription();
  const { createNotification } = useNotifications();
  const { state: companyState } = useCompany();
  const fileRef = useRef<HTMLInputElement>(null);

  const [repository, setRepository] = useState<ListingRepository | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<ListingFormState>({
    categoryId: "",
    subcategoryId: "",
    photos: [],
    videoLink: "",
    title: "",
    description: "",
    dynamicFields: {},
    price: null,
    priceType: "fixed",
    negotiation: "Not sure",
    availability: "available",
    state: currentLoc || "Kano",
    lga: "",
    city: "",
    contactName: companyState.personal?.fullName || companyState.company?.name || "",
    contactPhone: companyState.personal?.phone || companyState.company?.phone || "",
    promoId: "none",
    priceUnit: "per item",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [pay, setPay] = useState<{ title: string; amount: number; purpose: PaymentPurpose } | null>(
    null,
  );
  const [done, setDone] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selector, setSelector] = useState<
    "category" | "subcategory" | "location" | "priceUnit" | null
  >(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const [draftNotice, setDraftNotice] = useState(false);

  // Initialize repository and load draft
  useEffect(() => {
    void getListingRepository().then((repo) => {
      setRepository(repo);
      const draft = repo.getDraft();
      if (draft) {
        setForm((prev) => ({ ...prev, ...draft }));
      }
    });
  }, []);

  // Save draft on form change
  useEffect(() => {
    if (repository && !done) {
      repository.saveDraft(form);
    }
  }, [form, repository, done]);

  const category = useMemo(() => getCategory(form.categoryId), [form.categoryId]);
  const subcategory = useMemo(
    () => getSubcategory(form.categoryId, form.subcategoryId),
    [form.categoryId, form.subcategoryId],
  );

  const dynamicFields = useMemo(() => {
    const fields: DynamicField[] = [];
    if (category?.commonFields) fields.push(...category.commonFields);
    if (subcategory?.fields) fields.push(...subcategory.fields);
    return fields;
  }, [category, subcategory]);

  const priceUnits = useMemo(
    () => PRICE_UNITS_BY_CATEGORY[form.categoryId] ?? DEFAULT_PRICE_UNITS,
    [form.categoryId],
  );
  const lgaOptions = useMemo(
    () => (form.state ? NIGERIA_STATES_LGAS[form.state] || [] : []),
    [form.state],
  );

  const priceText = useMemo(() => {
    if (form.priceType === "free") return "Free";
    if (form.priceType === "request") return "Price on request";
    return form.price ? `₦${form.price.toLocaleString()}` : "₦0";
  }, [form.price, form.priceType]);
  const stepLabels = [
    { label: t("title"), caption: `${t("category")} & ${t("subcategory")}` },
    { label: t("photos"), caption: "Photos & video" },
    { label: t("location"), caption: "Location & specifications" },
    { label: t("preview"), caption: `${t("price")} & publish` },
  ];

  const onPickFiles = async (files: FileList | null) => {
    if (!files || !repository) return;
    setErrors((prev) => ({ ...prev, photos: "" }));
    const accepted: File[] = [];
    Array.from(files).forEach((f) => {
      if (f.size > 10 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, photos: `${f.name} ya wuce 10MB.` }));
        return;
      }
      if (
        !/image\/(jpeg|jpg|png|heic|webp)/i.test(f.type) &&
        !/\.(jpe?g|png|heic|webp)$/i.test(f.name)
      ) {
        setErrors((prev) => ({ ...prev, photos: `Format ba a yarda ba: ${f.name}` }));
        return;
      }
      accepted.push(f);
    });
    if (!accepted.length) return;

    if (replaceIndex !== null) {
      const file = accepted[0];
      const idx = replaceIndex;
      setReplaceIndex(null);
      setForm((prev) => ({
        ...prev,
        photos: prev.photos.map((photo, photoIndex) =>
          photoIndex === idx
            ? { url: URL.createObjectURL(file), name: file.name, uploading: true }
            : photo,
        ),
      }));
      try {
        const { objectKey } = await repository.uploadPhoto(file);
        setForm((prev) => ({
          ...prev,
          photos: prev.photos.map((photo, photoIndex) =>
            photoIndex === idx ? { ...photo, objectKey, uploading: false } : photo,
          ),
        }));
      } catch (e) {
        setForm((prev) => ({
          ...prev,
          photos: prev.photos.map((photo, photoIndex) =>
            photoIndex === idx
              ? {
                  ...photo,
                  uploading: false,
                  error: e instanceof Error ? e.message : "Upload failed",
                }
              : photo,
          ),
        }));
      }
      return;
    }

    const available = Math.max(0, 15 - form.photos.length);
    const filesToUpload = accepted.slice(0, available);
    const start = form.photos.length;
    const placeholders = filesToUpload.map((file) => ({
      url: URL.createObjectURL(file),
      name: file.name,
      uploading: true,
    }));
    setForm((prev) => ({ ...prev, photos: [...prev.photos, ...placeholders] }));

    await Promise.all(
      filesToUpload.map(async (file, offset) => {
        const idx = start + offset;
        try {
          const { objectKey } = await repository.uploadPhoto(file);
          setForm((prev) => ({
            ...prev,
            photos: prev.photos.map((photo, photoIndex) =>
              photoIndex === idx ? { ...photo, objectKey, uploading: false } : photo,
            ),
          }));
        } catch (e) {
          setForm((prev) => ({
            ...prev,
            photos: prev.photos.map((photo, photoIndex) =>
              photoIndex === idx
                ? {
                    ...photo,
                    uploading: false,
                    error: e instanceof Error ? e.message : "Upload failed",
                  }
                : photo,
            ),
          }));
        }
      }),
    );
  };

  const validateCurrentStep = () => {
    const newErrors: Record<string, string> = {};
    if (currentStep === 0) {
      if (!form.title.trim()) newErrors.title = t("post.error.titleRequired");
      else if (form.title.trim().length < 5) newErrors.title = t("post.error.titleShort");
      if (!form.categoryId) newErrors.category = t("post.error.categoryRequired");
      if (!form.subcategoryId) newErrors.subcategory = t("post.error.subcategoryRequired");
    }
    if (currentStep === 1) {
      if (form.photos.length === 0) newErrors.photos = t("post.error.photosRequired");
      if (form.photos.some((p) => p.uploading)) newErrors.photos = t("post.error.photosUploading");
      if (form.photos.some((p) => p.error)) newErrors.photos = t("post.error.photosError");
    }
    if (currentStep === 2) {
      if (!form.state) newErrors.state = t("post.error.stateRequired");
      if (!form.lga?.trim()) newErrors.lga = t("post.error.lgaRequired");
      if (!form.city.trim()) newErrors.city = t("post.error.cityRequired");
      for (const field of dynamicFields) {
        const value = form.dynamicFields[field.id];
        const empty =
          value === undefined ||
          value === null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0);
        if (field.required && empty) newErrors[`field_${field.id}`] = `Sanya ${field.label}.`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goNext = () => {
    if (!validateCurrentStep()) {
      const firstError = document.querySelector("[data-error]");
      if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setCurrentStep((step) => Math.min(step + 1, POST_STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setErrors({});
    setCurrentStep((step) => Math.max(step - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) newErrors.title = t("post.error.titleRequired");
    else if (form.title.length < 5) newErrors.title = t("post.error.titleShort");

    if (!form.categoryId) newErrors.category = t("post.error.categoryRequired");
    if (!form.subcategoryId) newErrors.subcategory = t("post.error.subcategoryRequired");

    if (form.photos.length === 0) newErrors.photos = t("post.error.photosRequired");
    if (form.photos.some((p) => p.uploading)) newErrors.photos = t("post.error.photosUploading");

    if (!form.state) newErrors.state = t("post.error.stateRequired");
    if (!form.lga?.trim()) newErrors.lga = t("post.error.lgaRequired");
    if (!form.city.trim()) newErrors.city = t("post.error.cityRequired");

    for (const field of dynamicFields) {
      const value = form.dynamicFields[field.id];
      const empty =
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0);
      if (field.required && empty) {
        newErrors[`field_${field.id}`] = `Sanya ${field.label}.`;
      }
    }

    if (!form.description.trim()) newErrors.description = t("post.error.descriptionRequired");
    else if (form.description.length < 20)
      newErrors.description = t("post.error.descriptionShort");

    if (
      form.priceType !== "free" &&
      form.priceType !== "request" &&
      (!form.price || form.price <= 0)
    ) {
      newErrors.price = t("post.error.priceRequired");
    }

    if (!form.contactName.trim()) newErrors.contactName = t("post.error.contactNameRequired");
    if (!/^\d{7,15}$/.test(form.contactPhone))
      newErrors.contactPhone = t("post.error.phoneRequired");

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveDraft = () => {
    if (!repository) return;
    repository.saveDraft(form);
    setDraftNotice(true);
    window.setTimeout(() => setDraftNotice(false), 2200);
  };

  const handlePost = async () => {
    if (!validateForm()) {
      const firstError = document.querySelector("[data-error]");
      if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!canPost) {
      setErrors({ global: t("post.error.quotaExhausted") });
      navigate({ to: "/subscribe" });
      return;
    }

    const promoTier = PROMOS.find((p) => p.id === form.promoId)!;
    if (promoTier.price > 0) {
      const purpose: PaymentPurpose =
        form.promoId === "premium"
          ? { kind: "promo_month", productId: "new" }
          : { kind: "promo_week", productId: "new" };

      setPay({
        title: `${promoTier.label} — ${promoTier.sub}`,
        amount: promoTier.price,
        purpose,
      });
      return;
    }

    await finalizePublish();
  };

  const finalizePublish = async () => {
    if (!repository) return;
    setLoading(true);
    setErrors({});
    try {
      const published = await repository.publish(form);
      createNotification({
        type: "listings",
        eventId: `listing-published:${published.id}`,
        title: "Listing published",
        body: `${form.title.trim()} is now live on FarmX.`,
        listing: {
          id: published.id,
          title: form.title.trim(),
          price: form.price,
          image: form.photos[0]?.url,
          location: `${form.city}, ${form.state}`,
        },
        targetUrl: `/product/${published.id}`,
      });
      consumeListing();
      repository.clearDraft();
      setDone(true);
      window.scrollTo(0, 0);
    } catch (e) {
      setErrors({
        global: e instanceof Error ? e.message : "Publishing failed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setForm({
      categoryId: "",
      subcategoryId: "",
      photos: [],
      videoLink: "",
      title: "",
      description: "",
      dynamicFields: {},
      price: null,
      priceType: "fixed",
      negotiation: "Not sure",
      availability: "available",
      state: currentLoc || "Kano",
      lga: "",
      city: "",
      contactName: companyState.personal?.fullName || companyState.company?.name || "",
      contactPhone: companyState.personal?.phone || companyState.company?.phone || "",
      promoId: "none",
      priceUnit: "per item",
    });
    setErrors({});
    setCurrentStep(0);
    setShowClearConfirm(false);
    repository?.clearDraft();
    window.scrollTo(0, 0);
  };

  if (done) {
    return (
      <AppShell title={t("success")}>
        <div className="flex flex-col items-center text-center py-16 px-6">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-black">{t("post.successTitle")}</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {t("post.successBody")}
          </p>
          <div className="mt-8 space-y-3 w-full max-w-xs">
            <button
              onClick={() => navigate({ to: "/market" })}
              className="w-full py-3 rounded-2xl bg-brand text-brand-foreground font-black shadow-lg shadow-brand/20"
            >
              {t("post.goToMarket")}
            </button>
            <button
              onClick={() => {
                setDone(false);
                clearForm();
              }}
              className="w-full py-3 rounded-2xl border border-border font-bold"
            >
              {t("post.postAnother")}
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Post New Ad">
      <div className="mx-auto max-w-2xl space-y-10 px-4 pb-52 pt-6">
        <header className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-black">Post New Ad</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveDraft}
              className="rounded-xl border border-border bg-card px-3 py-2 text-[10px] font-black text-muted-foreground transition hover:border-brand hover:text-brand"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1 text-xs font-bold text-muted-foreground transition-colors hover:text-brand"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
        </header>
        {draftNotice && (
          <p className="-mt-6 text-right text-[10px] font-bold text-emerald-600">
            Draft saved locally.
          </p>
        )}

        {errors.global && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm font-semibold flex gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errors.global}</span>
          </div>
        )}
        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">
                {t("postNewAd")}
              </p>
              <h2 className="mt-1 text-lg font-black">{stepLabels[currentStep].caption}</h2>
            </div>
            <span className="rounded-full bg-brand/10 px-3 py-1 text-[10px] font-black text-brand">
              {currentStep + 1}/{POST_STEPS.length}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-1.5" aria-label="Post progress">
                    {POST_STEPS.map((step, index) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => index < currentStep && setCurrentStep(index)}
                        className={`h-1.5 rounded-full transition ${index <= currentStep ? "bg-brand" : "bg-muted"}`}
                        aria-label={`${stepLabels[index].label} step`}
                        disabled={index >= currentStep}
                      />
                    ))}
          </div>
        </section>

        {currentStep === 0 && (
          <div className="space-y-8">
            {/* 1. Title */}
            <section className="space-y-4">
              <div className="flex justify-between items-end">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  {t("post.title")} *
                </label>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {form.title.length}/70
                </span>
              </div>
              <input
                type="text"
                maxLength={70}
                placeholder={t("post.titlePlaceholder")}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={`w-full p-4 rounded-2xl bg-card border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${errors.title ? "border-brand ring-2 ring-brand/10" : "border-border focus:border-brand"}`}
              />
              {errors.title && (
                <p className="text-[10px] font-bold text-brand flex items-center gap-1" data-error>
                  <AlertCircle className="h-3 w-3" /> {errors.title}
                </p>
              )}
            </section>

            {/* 2. Category & Subcategory */}
            <section className="space-y-4">
              <FieldLabel label={`${t("category")} *`} />
              <SelectorRow
                icon={category?.icon ?? "▦"}
                value={category?.name}
                placeholder={t("post.selectCategory")}
                onClick={() => setSelector("category")}
                invalid={!!errors.category}
              />
              {errors.category && <InlineError message={errors.category} />}

              {form.categoryId && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <FieldLabel label={`${t("subcategory")} *`} />
                  <SelectorRow
                    value={subcategory?.name}
                    placeholder={t("post.selectSubcategory")}
                    onClick={() => setSelector("subcategory")}
                    invalid={!!errors.subcategory}
                  />
                  {errors.subcategory && <InlineError message={errors.subcategory} />}
                </div>
              )}
            </section>
          </div>
        )}
        {currentStep === 1 && (
          <div className="space-y-8">
            {/* 3. Photos */}

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <FieldLabel label={t("photos")} />
                <span className="text-[10px] font-bold text-muted-foreground">
                  {form.photos.length}/15
                </span>
              </div>
              <div className="rounded-2xl border border-dashed border-brand/30 bg-brand/[0.03] p-4">
                <p className="text-xs font-bold">{t("post.addPhotos")}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {t("post.photoTip")}
                </p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-black text-brand-foreground shadow-sm shadow-brand/20 transition active:scale-[0.98]"
                >
                  <Camera className="h-4 w-4" /> {t("post.addPhotosButton")}
                </button>
              </div>

              {form.photos.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {form.photos.map((p, i) => (
                    <div
                      key={`${p.url}-${i}`}
                      className="group relative overflow-hidden rounded-2xl border border-border bg-muted"
                    >
                      <button
                        type="button"
                        onClick={() => setPreviewPhoto(p.url)}
                        className="block aspect-square w-full"
                        aria-label={`Preview photo ${i + 1}`}
                      >
                        <img
                          src={p.url}
                          alt={`Listing photo ${i + 1}`}
                          className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                        />
                      </button>
                      {i === 0 && (
                        <span className="absolute left-2 top-2 rounded-lg bg-brand px-2 py-1 text-[8px] font-black text-brand-foreground shadow-sm">
                          {t("post.coverPhoto")}
                        </span>
                      )}
                      {p.uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                      {p.error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-600/60">
                          <AlertCircle className="h-6 w-6 text-white" />
                        </div>
                      )}
                      <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewPhoto(p.url)}
                            className="rounded-lg bg-black/65 p-1.5 text-white backdrop-blur"
                            aria-label="Preview photo"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReplaceIndex(i);
                              fileRef.current?.click();
                            }}
                            className="rounded-lg bg-black/65 p-1.5 text-white backdrop-blur"
                            aria-label="Replace photo"
                          >
                            <Upload className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                photos: prev.photos.filter((_, photoIndex) => photoIndex !== i),
                              }))
                            }
                            className="rounded-lg bg-black/65 p-1.5 text-white backdrop-blur"
                            aria-label="Delete photo"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={i === 0}
                            onClick={() =>
                              setForm((prev) => {
                                if (i === 0) return prev;
                                const photos = [...prev.photos];
                                [photos[i - 1], photos[i]] = [photos[i], photos[i - 1]];
                                return { ...prev, photos };
                              })
                            }
                            className="rounded-lg bg-black/65 px-2 py-1 text-[9px] font-black text-white disabled:opacity-30"
                            aria-label="Move photo left"
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            disabled={i === form.photos.length - 1}
                            onClick={() =>
                              setForm((prev) => {
                                if (i === prev.photos.length - 1) return prev;
                                const photos = [...prev.photos];
                                [photos[i], photos[i + 1]] = [photos[i + 1], photos[i]];
                                return { ...prev, photos };
                              })
                            }
                            className="rounded-lg bg-black/65 px-2 py-1 text-[9px] font-black text-white disabled:opacity-30"
                            aria-label="Move photo right"
                          >
                            →
                          </button>
                        </div>
                      </div>
                      {i !== 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => {
                                const photos = [...prev.photos];
                                const [cover] = photos.splice(i, 1);
                                photos.unshift(cover);
                                return { ...prev, photos };
                              })
                            }
                            className="absolute bottom-2 left-2 rounded-lg bg-white/90 px-2 py-1 text-[9px] font-black text-brand opacity-0 transition group-hover:opacity-100 focus-within:opacity-100"
                          >
                            {t("post.setCover")}
                          </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {errors.photos && <InlineError message={errors.photos} />}
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={(e) => {
                  void onPickFiles(e.target.files);
                  e.currentTarget.value = "";
                }}
              />
            </section>

            {/* 4. Video */}
            <section className="space-y-4">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Video className="h-3.5 w-3.5" />
                Video Link
              </label>
              <input
                type="text"
                placeholder="YouTube or Facebook video URL"
                value={form.videoLink}
                onChange={(e) => setForm({ ...form, videoLink: e.target.value })}
                className="w-full p-4 rounded-2xl bg-card border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              />
            </section>
          </div>
        )}
        {currentStep === 2 && (
          <div className="space-y-8">
            {/* 5. Location */}

            <section className="space-y-3">
              <FieldLabel label={`${t("location")} *`} icon={<MapPin className="h-3.5 w-3.5" />} />
              <SelectorRow
                icon={<MapPin className="h-4 w-4 text-brand" />}
                value={[form.state, form.lga, form.city].filter(Boolean).join(", ")}
                placeholder={t("post.selectLocation")}
                onClick={() => setSelector("location")}
                invalid={!!(errors.state || errors.lga || errors.city)}
              />
              <p className="text-[10px] text-muted-foreground">
                {t("post.locationTip")}
              </p>
              {(errors.state || errors.lga || errors.city) && (
                <InlineError message="Complete your State, LGA and City/Area." />
              )}
            </section>

            {/* 6. Dynamic Attributes */}
            {dynamicFields.length > 0 && (
              <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-brand/10 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black">Specifications</h3>
                    <p className="text-[10px] text-muted-foreground">
                      Details for {subcategory?.name || category?.name}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {dynamicFields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                        {field.label} {field.required && "*"}
                      </label>

                      {field.type === "select" && (
                        <select
                          value={form.dynamicFields[field.id] || ""}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              dynamicFields: { ...form.dynamicFields, [field.id]: e.target.value },
                            })
                          }
                          className={`w-full p-4 rounded-2xl bg-card border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 appearance-none transition-all ${errors[`field_${field.id}`] ? "border-brand ring-2 ring-brand/10" : "border-border focus:border-brand"}`}
                        >
                          <option value="">Select {field.label}</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}

                      {field.type === "number" && (
                        <div className="relative">
                          <input
                            type="number"
                            placeholder={field.placeholder}
                            value={form.dynamicFields[field.id] || ""}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                dynamicFields: {
                                  ...form.dynamicFields,
                                  [field.id]: parseFloat(e.target.value),
                                },
                              })
                            }
                            className={`w-full p-4 rounded-2xl bg-card border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${errors[`field_${field.id}`] ? "border-brand ring-2 ring-brand/10" : "border-border focus:border-brand"}`}
                          />
                          {field.suffix && (
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                              {field.suffix}
                            </span>
                          )}
                        </div>
                      )}

                      {field.type === "text" && (
                        <input
                          type="text"
                          placeholder={field.placeholder}
                          value={form.dynamicFields[field.id] || ""}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              dynamicFields: { ...form.dynamicFields, [field.id]: e.target.value },
                            })
                          }
                          className={`w-full p-4 rounded-2xl bg-card border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${errors[`field_${field.id}`] ? "border-brand ring-2 ring-brand/10" : "border-border focus:border-brand"}`}
                        />
                      )}

                      {field.type === "textarea" && (
                        <textarea
                          rows={3}
                          placeholder={field.placeholder}
                          value={form.dynamicFields[field.id] || ""}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              dynamicFields: { ...form.dynamicFields, [field.id]: e.target.value },
                            })
                          }
                          className={`w-full resize-none rounded-2xl border bg-card p-4 text-sm font-medium outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 ${errors[`field_${field.id}`] ? "border-brand ring-2 ring-brand/10" : "border-border"}`}
                        />
                      )}

                      {field.type === "multiselect" && (
                        <input
                          type="text"
                          placeholder={field.placeholder || "Separate options with commas"}
                          value={
                            Array.isArray(form.dynamicFields[field.id])
                              ? form.dynamicFields[field.id].join(", ")
                              : form.dynamicFields[field.id] || ""
                          }
                          onChange={(e) =>
                            setForm({
                              ...form,
                              dynamicFields: {
                                ...form.dynamicFields,
                                [field.id]: e.target.value
                                  .split(",")
                                  .map((item) => item.trim())
                                  .filter(Boolean),
                              },
                            })
                          }
                          className={`w-full rounded-2xl border bg-card p-4 text-sm font-medium outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 ${errors[`field_${field.id}`] ? "border-brand ring-2 ring-brand/10" : "border-border"}`}
                        />
                      )}

                      {field.type === "boolean" && (
                        <div className="flex gap-2">
                          {["Yes", "No"].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() =>
                                setForm({
                                  ...form,
                                  dynamicFields: {
                                    ...form.dynamicFields,
                                    [field.id]: opt === "Yes",
                                  },
                                })
                              }
                              className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-all ${form.dynamicFields[field.id] === (opt === "Yes") ? "border-brand bg-brand/5 text-brand" : "border-border bg-card"}`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      {errors[`field_${field.id}`] && (
                        <p
                          className="text-[10px] font-bold text-brand flex items-center gap-1"
                          data-error
                        >
                          <AlertCircle className="h-3 w-3" /> {errors[`field_${field.id}`]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
        {currentStep === 3 && (
          <div className="space-y-8">
            {/* 7. Description */}
            <section className="space-y-4">
              <div className="flex justify-between items-end">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {t("description")} *
                  </label>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {form.description.length}/2000
                </span>
              </div>
              <textarea
                rows={6}
                maxLength={2000}
                placeholder={t("post.descriptionPlaceholder")}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={`w-full p-4 rounded-2xl bg-card border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all resize-none ${errors.description ? "border-brand ring-2 ring-brand/10" : "border-border focus:border-brand"}`}
              />
              <div className="flex gap-2 p-3 rounded-xl bg-blue-50 text-blue-700 text-[10px] font-medium leading-tight">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {t("post.descriptionTip")}
                </span>
              </div>
              {errors.description && (
                <p className="text-[10px] font-bold text-brand flex items-center gap-1" data-error>
                  <AlertCircle className="h-3 w-3" /> {errors.description}
                </p>
              )}
            </section>

            {/* 8. Price & Negotiation */}
            <section className="space-y-7 border-t border-border pt-7">
              <div className="space-y-3">
                <FieldLabel label={`${t("price")} *`} />
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">
                    ₦
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder={t("post.pricePlaceholder")}
                    value={form.price ?? ""}
                    disabled={form.priceType === "free" || form.priceType === "request"}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value ? Number(e.target.value) : null })
                    }
                    className={`w-full rounded-2xl border bg-card p-4 pl-10 text-sm font-medium outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-muted ${errors.price ? "border-brand ring-2 ring-brand/10" : "border-border"}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { id: "fixed", label: t("post.priceFixed") },
                    { id: "negotiable", label: t("post.priceNegotiable") },
                    { id: "request", label: t("post.priceRequest") },
                    { id: "free", label: t("post.priceFree") },
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          priceType: type.id as ListingFormState["priceType"],
                          price: type.id === "free" || type.id === "request" ? null : form.price,
                        })
                      }
                      className={`rounded-xl border px-3 py-2.5 text-[10px] font-black transition active:scale-[0.98] ${form.priceType === type.id ? "border-brand bg-brand/5 text-brand" : "border-border bg-card"}`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
                {(form.priceType === "fixed" || form.priceType === "negotiable") && (
                  <SelectorRow
                    value={form.priceUnit || "per item"}
                    placeholder={t("post.selectPriceUnit")}
                    onClick={() => setSelector("priceUnit")}
                    invalid={false}
                  />
                )}
                {errors.price && <InlineError message={errors.price} />}
              </div>

              <div className="space-y-3">
                <FieldLabel label={t("post.negotiablePrompt")} />
                <div className="grid grid-cols-3 gap-2">
                  {["Yes", "No", "Not sure"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        setForm({ ...form, negotiation: opt as ListingFormState["negotiation"] })
                      }
                      className={`rounded-xl border px-2 py-3 text-xs font-bold transition active:scale-[0.98] ${form.negotiation === opt ? "border-brand bg-brand/5 text-brand" : "border-border bg-card"}`}
                    >
                      {t(opt.toLowerCase())}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* 9. Seller Information */}
            <section className="space-y-6 pt-6 border-t border-border">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-brand/10 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-brand" />
                </div>
                <div>
                  <h3 className="text-sm font-black">{t("post.contactInfo")}</h3>
                  <p className="text-[10px] text-muted-foreground">{t("post.verifiedProfile")}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground px-1">{t("name")}</label>
                  <input
                    type="text"
                    placeholder={t("name")}
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    className={`w-full p-4 rounded-2xl bg-card border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${errors.contactName ? "border-brand ring-2 ring-brand/10" : "border-border focus:border-brand"}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground px-1">
                    {t("phoneNumber")}
                  </label>
                  <input
                    type="tel"
                    placeholder="08012345678"
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    className={`w-full p-4 rounded-2xl bg-card border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${errors.contactPhone ? "border-brand ring-2 ring-brand/10" : "border-border focus:border-brand"}`}
                  />
                </div>
              </div>
            </section>

            {/* 10. Promotion */}
            <section className="space-y-6 pt-6 border-t border-border">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-brand/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-brand" />
                </div>
                <div>
                  <h3 className="text-sm font-black">{t("post.boostVisibility")}</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {t("post.boostTip")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {PROMOS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onClick={() => setForm({ ...form, promoId: p.id as any })}
                    className={`flex items-center justify-between p-5 rounded-3xl border transition-all ${form.promoId === p.id ? "border-brand bg-brand/5 ring-2 ring-brand/20" : "border-border bg-card"}`}
                  >
                    <div className="text-left">
                      <p className="text-sm font-black">{t(`post.promo.${p.id}.label`)}</p>
                      <p className="text-[10px] text-muted-foreground">{t(`post.promo.${p.id}.sub`)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-brand">
                        {p.price > 0 ? `₦${p.price.toLocaleString()}` : t("free")}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* 11. Preview Card */}
            <section className="space-y-4 pt-6 border-t border-border">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  {t("post.adPreview")}
                </h3>
              </div>
              <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm opacity-80">
                <div className="aspect-[4/3] relative bg-muted">
                  {form.photos[0] ? (
                    <img src={form.photos[0].url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground/20" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-3 py-1 rounded-full bg-black/50 text-white text-[10px] font-black backdrop-blur-md">
                      {category?.name || t("category")}
                    </span>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <h2 className="text-lg font-black leading-tight">{form.title || t("post.noTitle")}</h2>
                    <div className="flex items-center gap-1.5 text-brand mt-1">
                      <span className="text-xl font-black">{priceText}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="px-3 py-1.5 rounded-xl bg-muted text-[10px] font-bold flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" />
                      {form.city || t("city")}, {form.state}
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-muted text-[10px] font-bold">
                      {subcategory?.name || t("subcategory")}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Safety Reminder */}
            <div className="p-5 rounded-3xl bg-amber-50 border border-amber-100 space-y-3">
              <div className="flex items-center gap-2 text-amber-800">
                <ShieldCheck className="h-5 w-5" />
                <h4 className="text-xs font-black">{t("post.safetyTitle")}</h4>
              </div>
              <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                {t("post.safetyTip")}
              </p>
              <Link
                to="/profile-center/$section"
                params={{ section: "safety" }}
                className="text-[10px] font-black text-amber-900 underline"
              >
                {t("post.readSafety")}
              </Link>
            </div>
          </div>
        )}
        {/* Final Button */}
        <div className="fixed bottom-20 left-0 right-0 z-40 border-t border-border bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
          <div className="mx-auto max-w-md space-y-3">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
              <span>{stepLabels[currentStep].label}</span>
              <span>
                {currentStep + 1}/{POST_STEPS.length}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand transition-all duration-200"
                style={{ width: `${((currentStep + 1) / POST_STEPS.length) * 100}%` }}
              />
            </div>
            <div className="flex gap-3">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={loading}
                  className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card font-black transition hover:border-brand hover:text-brand disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                  {t("back")}
                </button>
              )}
              {currentStep < POST_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand font-black text-brand-foreground shadow-lg shadow-brand/20 transition hover:opacity-90"
                >
                  {t("continue")}
                  <ChevronRight className="h-5 w-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePost}
                  disabled={loading}
                  className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand font-black text-brand-foreground shadow-lg shadow-brand/20 transition hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Check className="h-5 w-5" />
                  )}
                  {t("publishListing")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-card w-full max-w-xs rounded-3xl border border-border p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-black leading-tight">Clear Form?</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              This will remove all information you have entered. This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={clearForm}
                className="w-full py-3 rounded-xl bg-red-600 text-white font-black shadow-lg shadow-red-600/20"
              >
                Yes, Clear
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="w-full py-3 rounded-xl border border-border font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selector && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => setSelector(null)}
        >
          <div
            className="max-h-[88vh] w-full max-w-xl overflow-hidden rounded-t-[2rem] border border-border bg-card shadow-2xl sm:rounded-[2rem]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand">
                  FarmX selector
                </p>
                <h2 className="mt-1 text-lg font-black">
                  {selector === "category"
                    ? t("post.selectCategory")
                    : selector === "subcategory"
                      ? t("post.selectSubcategory")
                      : selector === "location"
                        ? t("post.selectLocation")
                        : t("post.selectPriceUnit")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelector(null)}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-accent"
                aria-label="Close selector"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selector === "category" && (
              <div className="max-h-[68vh] overflow-y-auto p-3">
                {UNIVERSAL_CATEGORIES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        categoryId: item.id,
                        subcategoryId: "",
                        dynamicFields: {},
                        priceUnit: PRICE_UNITS_BY_CATEGORY[item.id]?.[0] ?? "per item",
                      }));
                      setErrors((prev) => ({ ...prev, category: "", subcategory: "" }));
                      setSelector(null);
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition hover:bg-brand/5 active:scale-[0.99] ${form.categoryId === item.id ? "bg-brand/5 text-brand" : ""}`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-xl">
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-bold">{item.name}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            {selector === "subcategory" && (
              <div className="max-h-[68vh] overflow-y-auto p-3">
                {category?.subcategories.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, subcategoryId: item.id, dynamicFields: {} }));
                      setErrors((prev) => ({ ...prev, subcategory: "" }));
                      setSelector(null);
                    }}
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left transition hover:bg-brand/5 active:scale-[0.99] ${form.subcategoryId === item.id ? "bg-brand/5 text-brand" : ""}`}
                  >
                    <span className="text-sm font-bold">{item.name}</span>
                    {form.subcategoryId === item.id ? (
                      <Check className="h-4 w-4 text-brand" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {selector === "priceUnit" && (
              <div className="max-h-[68vh] overflow-y-auto p-3">
                {priceUnits.map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, priceUnit: unit }));
                      setSelector(null);
                    }}
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left transition hover:bg-brand/5 active:scale-[0.99] ${form.priceUnit === unit ? "bg-brand/5 text-brand" : ""}`}
                  >
                    <span className="text-sm font-bold capitalize">{unit}</span>
                    {form.priceUnit === unit ? (
                      <Check className="h-4 w-4 text-brand" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {selector === "location" && (
              <div className="max-h-[76vh] space-y-4 overflow-y-auto p-5">
                <div className="space-y-2">
                  <FieldLabel label={t("state")} />
                  <div className="grid max-h-44 grid-cols-2 gap-2 overflow-y-auto rounded-2xl border border-border p-2 sm:grid-cols-3">
                    {NIGERIA_STATES.map((state) => (
                      <button
                        key={state}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, state, lga: "", city: "" }))}
                        className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition ${form.state === state ? "border-brand bg-brand/5 text-brand" : "border-border bg-background"}`}
                      >
                        {state}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <FieldLabel label={t("lga")} />
                  <div className="grid grid-cols-2 gap-2">
                    {lgaOptions.map((lga) => (
                      <button
                        key={lga}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, lga }))}
                        className={`rounded-xl border px-3 py-3 text-left text-xs font-bold transition ${form.lga === lga ? "border-brand bg-brand/5 text-brand" : "border-border bg-background"}`}
                      >
                        {lga}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <FieldLabel label={t("city")} />
                  <input
                    value={form.city}
                    onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                    placeholder={t("post.cityPlaceholder")}
                    className="w-full rounded-2xl border border-border bg-background p-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSelector(null)}
                  className="w-full rounded-2xl bg-brand py-3.5 text-sm font-black text-brand-foreground shadow-lg shadow-brand/20"
                >
                  {t("post.saveLocation")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {previewPhoto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-5"
          onClick={() => setPreviewPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewPhoto(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"
            aria-label="Close photo preview"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={previewPhoto}
            alt="Full listing preview"
            className="max-h-[85vh] max-w-full rounded-2xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

      {pay && (
        <PayModal
          open={!!pay}
          onClose={() => setPay(null)}
          onPaid={() => {
            setPay(null);
            void finalizePublish();
          }}
          title={pay.title}
          amountNaira={pay.amount}
          purpose={pay.purpose}
        />
      )}
    </AppShell>
  );
}

function FieldLabel({ label, icon }: { label: string; icon?: ReactNode }) {
  return (
    <label className="flex items-center gap-2 px-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
      {icon}
      {label}
    </label>
  );
}

function SelectorRow({
  icon,
  value,
  placeholder,
  onClick,
  invalid,
}: {
  icon?: ReactNode;
  value?: string;
  placeholder: string;
  onClick: () => void;
  invalid: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border bg-card px-4 text-left transition hover:border-brand/60 active:scale-[0.995] ${invalid ? "border-brand ring-2 ring-brand/10" : "border-border"}`}
    >
      {icon && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          {icon}
        </span>
      )}
      <span
        className={`min-w-0 flex-1 truncate text-sm font-semibold ${value ? "text-foreground" : "text-muted-foreground"}`}
      >
        {value || placeholder}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1 text-[10px] font-bold text-brand" data-error>
      <AlertCircle className="h-3 w-3" /> {message}
    </p>
  );
}
