import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { PayModal } from "@/components/PayModal";
import { PRICING, LOCATIONS } from "@/lib/mock-data";
import { useLocation } from "@/lib/location";
import type { PaymentPurpose } from "@/lib/paystack";
import { useSubscription } from "@/lib/subscription";
import { useCommerce } from "@/lib/commerce-store";
import { useCompany } from "@/lib/company-store";
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
    sub: "30 days visibility boost",
  },
] as const;

function PostProduct() {
  const navigate = useNavigate();
  const { location: currentLoc } = useLocation();
  const { canPost, consumeListing } = useSubscription();
  const { state: companyState } = useCompany();
  const fileRef = useRef<HTMLInputElement>(null);

  const [repository, setRepository] = useState<ListingRepository | null>(null);
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
    city: "",
    contactName: companyState.personal?.fullName || companyState.company?.name || "",
    contactPhone: companyState.personal?.phone || companyState.company?.phone || "",
    promoId: "none",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [pay, setPay] = useState<{ title: string; amount: number; purpose: PaymentPurpose } | null>(
    null,
  );
  const [done, setDone] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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

  const priceText = useMemo(() => {
    if (form.priceType === "free") return "Free";
    if (form.priceType === "request") return "Price on request";
    return form.price ? `₦${form.price.toLocaleString()}` : "₦0";
  }, [form.price, form.priceType]);

  const onPickFiles = async (files: FileList | null) => {
    if (!files || !repository) return;
    setErrors((prev) => ({ ...prev, photos: "" }));
    const accepted: File[] = [];
    Array.from(files).forEach((f) => {
      if (f.size > 10 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, photos: `${f.name} ya wuce 10MB.` }));
        return;
      }
      if (!/jpeg|jpg|png|heic|webp/i.test(f.type + f.name)) {
        setErrors((prev) => ({ ...prev, photos: `Format ba a yarda ba: ${f.name}` }));
        return;
      }
      accepted.push(f);
    });

    const start = form.photos.length;
    const placeholders = accepted.map((f) => ({
      url: URL.createObjectURL(f),
      name: f.name,
      uploading: true,
    }));

    setForm((prev) => ({ ...prev, photos: [...prev.photos, ...placeholders].slice(0, 10) }));

    await Promise.all(
      accepted.slice(0, 10 - start).map(async (f, i) => {
        const idx = start + i;
        try {
          const { objectKey } = await repository.uploadPhoto(f);
          setForm((prev) => ({
            ...prev,
            photos: prev.photos.map((p, x) =>
              x === idx ? { ...p, objectKey, uploading: false } : p,
            ),
          }));
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Upload failed";
          setForm((prev) => ({
            ...prev,
            photos: prev.photos.map((p, x) =>
              x === idx ? { ...p, uploading: false, error: msg } : p,
            ),
          }));
        }
      }),
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) newErrors.title = "Sanya sunan talla (Title).";
    else if (form.title.length < 5) newErrors.title = "Title ya yi gajarta sosai.";

    if (!form.categoryId) newErrors.category = "Zaɓi Category.";
    if (!form.subcategoryId) newErrors.subcategory = "Zaɓi Subcategory.";

    if (form.photos.length === 0) newErrors.photos = "Saka aƙalla hoto 1.";
    if (form.photos.some((p) => p.uploading)) newErrors.photos = "Jira hotuna su gama loduwa…";

    if (!form.state) newErrors.state = "Zaɓi State.";
    if (!form.city.trim()) newErrors.city = "Sanya gari (City).";

    for (const field of dynamicFields) {
      if (field.required && !form.dynamicFields[field.id]) {
        newErrors[`field_${field.id}`] = `Sanya ${field.label}.`;
      }
    }

    if (!form.description.trim()) newErrors.description = "Rubuta bayanin talla (Description).";
    else if (form.description.length < 20)
      newErrors.description = "Description ya yi gajarta, ƙara bayani.";

    if (
      form.priceType !== "free" &&
      form.priceType !== "request" &&
      (!form.price || form.price <= 0)
    ) {
      newErrors.price = "Sanya farashi (Price).";
    }

    if (!form.contactName.trim()) newErrors.contactName = "Sanya sunan mai talla.";
    if (!/^\d{7,15}$/.test(form.contactPhone)) newErrors.contactPhone = "Sanya lambar waya mai kyau.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePost = async () => {
    if (!validateForm()) {
      const firstError = document.querySelector("[data-error]");
      if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!canPost) {
      setErrors({ global: "Quota ɗinka ya ƙare. Sayi subscription don ci gaba." });
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
      await repository.publish(form);
      consumeListing();
      repository.clearDraft();
      setDone(true);
      window.scrollTo(0, 0);
    } catch (e) {
      setErrors({ global: e instanceof Error ? e.message : "Publishing failed. Please try again." });
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
      city: "",
      contactName: companyState.personal?.fullName || companyState.company?.name || "",
      contactPhone: companyState.personal?.phone || companyState.company?.phone || "",
      promoId: "none",
    });
    setErrors({});
    setShowClearConfirm(false);
    repository?.clearDraft();
    window.scrollTo(0, 0);
  };

  if (done) {
    return (
      <AppShell title="Success">
        <div className="flex flex-col items-center text-center py-16 px-6">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-black">Talla ya shiga Market!</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Mun karɓi tallarka. Zai bayyana a cikin Market da kuma dashboard ɗinka nan take.
          </p>
          <div className="mt-8 space-y-3 w-full max-w-xs">
            <button
              onClick={() => navigate({ to: "/market" })}
              className="w-full py-3 rounded-2xl bg-brand text-brand-foreground font-black shadow-lg shadow-brand/20"
            >
              Go to Market
            </button>
            <button
              onClick={() => {
                setDone(false);
                clearForm();
              }}
              className="w-full py-3 rounded-2xl border border-border font-bold"
            >
              Post another ad
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Post New Ad">
      <div className="max-w-2xl mx-auto space-y-10 pb-40 px-4 pt-6">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-black">Post New Ad</h1>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-xs font-bold text-muted-foreground flex items-center gap-1 hover:text-brand transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        </header>

        {errors.global && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm font-semibold flex gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errors.global}</span>
          </div>
        )}

        {/* 1. Title */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Title *
            </label>
            <span className="text-[10px] font-bold text-muted-foreground">
              {form.title.length}/70
            </span>
          </div>
          <input
            type="text"
            maxLength={70}
            placeholder="Enter a clear title for your listing"
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
        <section className="space-y-6">
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Category *
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {UNIVERSAL_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() =>
                    setForm({ ...form, categoryId: c.id, subcategoryId: "", dynamicFields: {} })
                  }
                  className={`flex flex-col items-center justify-center p-4 rounded-3xl border transition-all ${form.categoryId === c.id ? "border-brand bg-brand/5 ring-2 ring-brand/20" : "border-border bg-card"}`}
                >
                  <span className="text-2xl mb-2">{c.icon}</span>
                  <span className="text-[10px] font-bold text-center leading-tight">{c.name}</span>
                </button>
              ))}
            </div>
            {errors.category && (
              <p className="text-[10px] font-bold text-brand flex items-center gap-1" data-error>
                <AlertCircle className="h-3 w-3" /> {errors.category}
              </p>
            )}
          </div>

          {form.categoryId && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Subcategory *
              </label>
              <div className="grid grid-cols-1 gap-2">
                {category?.subcategories.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setForm({ ...form, subcategoryId: s.id, dynamicFields: {} })}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${form.subcategoryId === s.id ? "border-brand bg-brand/5" : "border-border bg-card"}`}
                  >
                    <span className="text-sm font-bold">{s.name}</span>
                    {form.subcategoryId === s.id && <Check className="h-4 w-4 text-brand" />}
                  </button>
                ))}
              </div>
              {errors.subcategory && (
                <p className="text-[10px] font-bold text-brand flex items-center gap-1" data-error>
                  <AlertCircle className="h-3 w-3" /> {errors.subcategory}
                </p>
              )}
            </div>
          )}
        </section>

        {/* 3. Photos */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Photos *
            </label>
            <span className="text-[10px] font-bold text-muted-foreground">
              {form.photos.length}/10
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {form.photos.map((p, i) => (
              <div
                key={i}
                className="relative aspect-square rounded-2xl overflow-hidden border border-border bg-muted group"
              >
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute top-2 left-2 text-[8px] px-1.5 py-0.5 rounded-lg bg-brand text-brand-foreground font-black shadow-md">
                    COVER
                  </span>
                )}
                {p.uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
                {p.error && (
                  <div className="absolute inset-0 bg-red-500/40 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-white" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() =>
                      setForm({ ...form, photos: form.photos.filter((_, x) => x !== i) })
                    }
                    className="h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
            {form.photos.length < 10 && (
              <button
                onClick={() => fileRef.current?.click()}
                className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-brand hover:text-brand transition-colors ${errors.photos ? "border-brand bg-brand/5" : "border-border bg-card"}`}
              >
                <Camera className="h-6 w-6" />
                <span className="text-[10px] font-bold">Add Photo</span>
              </button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Add at least 5 photos for better visibility. First photo is your cover.
          </p>
          {errors.photos && (
            <p className="text-[10px] font-bold text-brand flex items-center gap-1" data-error>
              <AlertCircle className="h-3 w-3" /> {errors.photos}
            </p>
          )}
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => onPickFiles(e.target.files)}
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

        {/* 5. Location */}
        <section className="space-y-6">
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              Location *
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground px-1">State</p>
                <select
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className={`w-full p-4 rounded-2xl bg-card border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 appearance-none transition-all ${errors.state ? "border-brand ring-2 ring-brand/10" : "border-border focus:border-brand"}`}
                >
                  {LOCATIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground px-1">City / LGA</p>
                <input
                  type="text"
                  placeholder="e.g. Ikeja, Maitama..."
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className={`w-full p-4 rounded-2xl bg-card border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${errors.city ? "border-brand ring-2 ring-brand/10" : "border-border focus:border-brand"}`}
                />
              </div>
            </div>
            {(errors.state || errors.city) && (
              <p className="text-[10px] font-bold text-brand flex items-center gap-1" data-error>
                <AlertCircle className="h-3 w-3" /> Location information is required.
              </p>
            )}
          </div>
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

                  {field.type === "boolean" && (
                    <div className="flex gap-2">
                      {["Yes", "No"].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              dynamicFields: { ...form.dynamicFields, [field.id]: opt === "Yes" },
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
                    <p className="text-[10px] font-bold text-brand flex items-center gap-1" data-error>
                      <AlertCircle className="h-3 w-3" /> {errors[`field_${field.id}`]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 7. Description */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Description *
            </label>
            <span className="text-[10px] font-bold text-muted-foreground">
              {form.description.length}/2000
            </span>
          </div>
          <textarea
            rows={6}
            maxLength={2000}
            placeholder="Describe the item or service accurately. Include important details buyers should know..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={`w-full p-4 rounded-2xl bg-card border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all resize-none ${errors.description ? "border-brand ring-2 ring-brand/10" : "border-border focus:border-brand"}`}
          />
          <div className="flex gap-2 p-3 rounded-xl bg-blue-50 text-blue-700 text-[10px] font-medium leading-tight">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>
              Tip: Mention the condition, features, and why you are selling to attract more buyers.
            </span>
          </div>
          {errors.description && (
            <p className="text-[10px] font-bold text-brand flex items-center gap-1" data-error>
              <AlertCircle className="h-3 w-3" /> {errors.description}
            </p>
          )}
        </section>

        {/* 8. Price & Negotiation */}
        <section className="space-y-8">
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Price *
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { id: "fixed", label: "Fixed" },
                { id: "negotiable", label: "Negotiable" },
                { id: "request", label: "Request" },
                { id: "free", label: "Free" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setForm({ ...form, priceType: t.id as any })}
                  className={`p-3 rounded-xl border text-[10px] font-black transition-all ${form.priceType === t.id ? "border-brand bg-brand/5 text-brand" : "border-border bg-card"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {(form.priceType === "fixed" || form.priceType === "negotiable") && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">
                    ₦
                  </span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={form.price || ""}
                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })}
                    className={`w-full pl-10 p-4 rounded-2xl bg-card border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${errors.price ? "border-brand ring-2 ring-brand/10" : "border-border focus:border-brand"}`}
                  />
                </div>
                {errors.price && (
                  <p className="text-[10px] font-bold text-brand flex items-center gap-1" data-error>
                    <AlertCircle className="h-3 w-3" /> {errors.price}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Open to negotiation?
            </label>
            <div className="flex gap-2">
              {["Yes", "No", "Not sure"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setForm({ ...form, negotiation: opt as any })}
                  className={`flex-1 py-3 rounded-xl border font-bold text-xs transition-all ${form.negotiation === opt ? "border-brand bg-brand/5 text-brand" : "border-border bg-card"}`}
                >
                  {opt}
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
              <h3 className="text-sm font-black">Contact Information</h3>
              <p className="text-[10px] text-muted-foreground">Verified from your profile</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground px-1">Name</label>
              <input
                type="text"
                placeholder="Your name"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                className={`w-full p-4 rounded-2xl bg-card border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${errors.contactName ? "border-brand ring-2 ring-brand/10" : "border-border focus:border-brand"}`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground px-1">
                Phone Number
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
              <h3 className="text-sm font-black">Boost Visibility</h3>
              <p className="text-[10px] text-muted-foreground">Get up to 10x more views and sales</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {PROMOS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setForm({ ...form, promoId: p.id as any })}
                className={`flex items-center justify-between p-5 rounded-3xl border transition-all ${form.promoId === p.id ? "border-brand bg-brand/5 ring-2 ring-brand/20" : "border-border bg-card"}`}
              >
                <div className="text-left">
                  <p className="text-sm font-black">{p.label}</p>
                  <p className="text-[10px] text-muted-foreground">{p.sub}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-brand">
                    {p.price > 0 ? `₦${p.price.toLocaleString()}` : "FREE"}
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
              Ad Preview
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
                  {category?.name || "Category"}
                </span>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <h2 className="text-lg font-black leading-tight">{form.title || "No Title"}</h2>
                <div className="flex items-center gap-1.5 text-brand mt-1">
                  <span className="text-xl font-black">{priceText}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-muted text-[10px] font-bold flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" />
                  {form.city || "City"}, {form.state}
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-muted text-[10px] font-bold">
                  {subcategory?.name || "Subcategory"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Safety Reminder */}
        <div className="p-5 rounded-3xl bg-amber-50 border border-amber-100 space-y-3">
          <div className="flex items-center gap-2 text-amber-800">
            <ShieldCheck className="h-5 w-5" />
            <h4 className="text-xs font-black">Safety First!</h4>
          </div>
          <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
            FarmX is a classified marketplace. Always meet in public places, inspect items
            thoroughly before payment, and never pay in advance to sellers you don't trust.
          </p>
          <Link
            to="/profile-center/$section"
            params={{ section: "safety" }}
            className="text-[10px] font-black text-amber-900 underline"
          >
            Read safety tips
          </Link>
        </div>

        {/* Final Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border z-30">
          <div className="max-w-md mx-auto">
            <button
              onClick={handlePost}
              disabled={loading}
              className="w-full h-14 rounded-2xl bg-brand text-brand-foreground font-black shadow-lg shadow-brand/20 flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  Post Ad
                </>
              )}
            </button>
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
