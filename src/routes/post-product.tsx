import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { PayModal } from "@/components/PayModal";
import { PRICING, LOCATIONS } from "@/lib/mock-data";
import { useLocation } from "@/lib/location";
import type { PaymentPurpose } from "@/lib/paystack";
import { useSubscription } from "@/lib/subscription";
import { useCommerce } from "@/lib/commerce-store";
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
} from "lucide-react";

export const Route = createFileRoute("/post-product")({ component: PostProduct });

const STEPS = [
  "Category",
  "Media",
  "Information",
  "Details",
  "Pricing",
  "Location",
  "Preview",
] as const;

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
  const { location } = useLocation();
  const { canPost, consumeListing } = useSubscription();
  const { addPromo } = useCommerce();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
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
    state: location || "Kano",
    city: "",
    contactName: "",
    contactPhone: "",
    promoId: "none",
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pay, setPay] = useState<{ title: string; amount: number; purpose: PaymentPurpose } | null>(
    null,
  );
  const [done, setDone] = useState(false);

  const priceText = useMemo(() => {
    if (form.priceType === "free") return "Free";
    if (form.priceType === "request") return "Price on request";
    return form.price ? `₦${form.price.toLocaleString()}` : "₦0";
  }, [form.price, form.priceType]);

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
    if (repository && step > 0 && !done) {
      repository.saveDraft(form);
    }
  }, [form, repository, step, done]);

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

  const onPickFiles = async (files: FileList | null) => {
    if (!files || !repository) return;
    setError(null);
    const accepted: File[] = [];
    Array.from(files).forEach((f) => {
      if (f.size > 10 * 1024 * 1024) {
        setError(`${f.name} ya wuce 10MB.`);
        return;
      }
      if (!/jpeg|jpg|png|heic|webp/i.test(f.type + f.name)) {
        setError(`Format ba a yarda ba: ${f.name}`);
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
          setError(`Upload failed: ${f.name}`);
        }
      }),
    );
  };

  const validateStep = () => {
    setError(null);
    if (step === 0) {
      if (!form.categoryId) return "Zaɓi Category.";
      if (!form.subcategoryId) return "Zaɓi Subcategory.";
    }
    if (step === 1) {
      if (form.photos.length === 0) return "Saka aƙalla hoto 1.";
      if (form.photos.some((p) => p.uploading)) return "Jira hotuna su gama loduwa…";
    }
    if (step === 2) {
      if (!form.title.trim()) return "Sanya sunan talla (Title).";
      if (form.title.length < 5) return "Title ya yi gajarta sosai.";
      if (!form.description.trim()) return "Rubuta bayanin talla (Description).";
      if (form.description.length < 20) return "Description ya yi gajarta, ƙara bayani.";
    }
    if (step === 3) {
      for (const field of dynamicFields) {
        if (field.required && !form.dynamicFields[field.id]) {
          return `Sanya ${field.label}.`;
        }
      }
    }
    if (step === 4) {
      if (
        form.priceType !== "free" &&
        form.priceType !== "request" &&
        (!form.price || form.price <= 0)
      ) {
        return "Sanya farashi (Price).";
      }
    }
    if (step === 5) {
      if (!form.state) return "Zaɓi State.";
      if (!form.city.trim()) return "Sanya gari (City).";
      if (!form.contactName.trim()) return "Sanya sunan mai talla.";
      if (!/^\d{7,15}$/.test(form.contactPhone)) return "Sanya lambar waya mai kyau.";
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      window.scrollTo(0, 0);
    } else {
      submit();
    }
  };

  const prev = () => {
    if (step > 0) {
      setStep(step - 1);
      window.scrollTo(0, 0);
    }
  };

  const submit = async () => {
    if (!canPost) {
      setError("Quota ɗinka ya ƙare. Sayi subscription don ci gaba.");
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
    setError(null);
    try {
      await repository.publish(form);
      consumeListing();
      repository.clearDraft();
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publishing failed. Please try again.");
    } finally {
      setLoading(false);
    }
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
                setStep(0);
                setForm({
                  ...form,
                  photos: [],
                  title: "",
                  description: "",
                  dynamicFields: {},
                  price: null,
                });
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
    <AppShell title="Create New Ad">
      <div className="space-y-6 pb-32">
        {/* Progress Bar */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md pt-2 pb-4 border-b border-border">
          <div className="flex justify-between items-center px-1 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand">
              Step {step + 1} of {STEPS.length}
            </span>
            <span className="text-xs font-bold">{STEPS[step]}</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-brand transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="flex gap-2 p-3 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 0: Category */}
        {step === 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <div className="grid grid-cols-2 gap-3">
              {UNIVERSAL_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() =>
                    setForm({ ...form, categoryId: c.id, subcategoryId: "", dynamicFields: {} })
                  }
                  className={`flex flex-col items-center justify-center p-4 rounded-3xl border transition-all ${form.categoryId === c.id ? "border-brand bg-brand/5 ring-2 ring-brand/20" : "border-border bg-card"}`}
                >
                  <span className="text-3xl mb-2">{c.icon}</span>
                  <span className="text-[10px] font-bold text-center leading-tight">{c.name}</span>
                </button>
              ))}
            </div>

            {form.categoryId && (
              <div className="mt-6 space-y-3 animate-in fade-in slide-in-from-top-4">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">
                  Select Subcategory
                </p>
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
              </div>
            )}
          </div>
        )}

        {/* Step 1: Media */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="rounded-3xl border border-brand/20 bg-brand/5 p-5 text-center">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-brand/10 flex items-center justify-center mb-3">
                <ImageIcon className="h-6 w-6 text-brand" />
              </div>
              <h3 className="text-sm font-black">
                Add photos of your {subcategory?.name || "item"}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-1">
                First photo will be the main cover image. Max 10 photos.
              </p>

              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickFiles(e.target.files)}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-4 px-6 py-2.5 rounded-xl bg-brand text-brand-foreground text-xs font-black shadow-lg shadow-brand/20"
              >
                Select Photos
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {form.photos.map((p, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-2xl overflow-hidden border border-border bg-muted"
                >
                  <img src={p.url} alt="" className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute top-2 left-2 text-[8px] px-1.5 py-0.5 rounded-lg bg-brand text-brand-foreground font-black">
                      MAIN
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
                  <button
                    onClick={() =>
                      setForm({ ...form, photos: form.photos.filter((_, x) => x !== i) })
                    }
                    className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {form.photos.length > 0 && form.photos.length < 10 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-brand hover:text-brand transition-colors"
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-[10px] font-bold">Add More</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                <Video className="h-3.5 w-3.5" />
                Video Link (Optional)
              </label>
              <input
                type="text"
                placeholder="YouTube or Facebook video URL"
                value={form.videoLink}
                onChange={(e) => setForm({ ...form, videoLink: e.target.value })}
                className="w-full p-4 rounded-2xl bg-card border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              />
            </div>
          </div>
        )}

        {/* Step 2: Information */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="space-y-3">
              <div className="flex justify-between items-end px-1">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Ad Title *
                </label>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {form.title.length}/70
                </span>
              </div>
              <input
                type="text"
                maxLength={70}
                placeholder="e.g. Toyota Camry 2018, Samsung Galaxy S24..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full p-4 rounded-2xl bg-card border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              />
              <p className="text-[10px] text-muted-foreground px-1">
                Use a clear title that describes exactly what you are selling.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end px-1">
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
                className="w-full p-4 rounded-2xl bg-card border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all resize-none"
              />
              <div className="flex gap-2 p-3 rounded-xl bg-blue-50 text-blue-700 text-[10px] font-medium leading-tight">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Tip: Mention the condition, features, and why you are selling to attract more
                  buyers.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Dynamic Details */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-3 px-1">
              <div className="h-8 w-8 rounded-xl bg-brand/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-brand" />
              </div>
              <div>
                <h3 className="text-sm font-black">Specifications</h3>
                <p className="text-[10px] text-muted-foreground">
                  Provide specific details for this category.
                </p>
              </div>
            </div>

            {dynamicFields.length > 0 ? (
              <div className="grid grid-cols-1 gap-5">
                {dynamicFields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">
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
                        className="w-full p-4 rounded-2xl bg-card border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all appearance-none"
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
                          className="w-full p-4 rounded-2xl bg-card border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
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
                        className="w-full p-4 rounded-2xl bg-card border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                      />
                    )}

                    {field.type === "boolean" && (
                      <div className="flex gap-2">
                        {["Yes", "No"].map((opt) => (
                          <button
                            key={opt}
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
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center border-2 border-dashed border-border rounded-3xl">
                <p className="text-xs font-bold text-muted-foreground">
                  No specific details required for this subcategory.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Pricing */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">
                Price Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "fixed", label: "Fixed Price" },
                  { id: "negotiable", label: "Negotiable" },
                  { id: "request", label: "Price on Request" },
                  { id: "free", label: "Free" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setForm({ ...form, priceType: t.id as any })}
                    className={`p-4 rounded-2xl border text-xs font-bold transition-all ${form.priceType === t.id ? "border-brand bg-brand/5 text-brand" : "border-border bg-card"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {(form.priceType === "fixed" || form.priceType === "negotiable") && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">
                  Price (₦) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">
                    ₦
                  </span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={form.price || ""}
                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })}
                    className="w-full pl-10 p-4 rounded-2xl bg-card border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">
                Availability
              </label>
              <select
                value={form.availability}
                onChange={(e) => setForm({ ...form, availability: e.target.value as any })}
                className="w-full p-4 rounded-2xl bg-card border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all appearance-none"
              >
                <option value="available">In Stock / Available</option>
                <option value="pre_order">Pre-order</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="busy">Busy (Services)</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 5: Location & Contact */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  State *
                </label>
                <select
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full p-4 rounded-2xl bg-card border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all appearance-none"
                >
                  {LOCATIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">
                  City / LGA *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ikeja, Maitama, Ungogo..."
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full p-4 rounded-2xl bg-card border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                />
              </div>

              <div className="pt-4 border-t border-border">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2 mb-4">
                  <Phone className="h-3.5 w-3.5" />
                  Contact Information
                </label>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground px-1">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={form.contactName}
                      onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                      className="w-full p-4 rounded-2xl bg-card border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground px-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      placeholder="08012345678"
                      value={form.contactPhone}
                      onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                      className="w-full p-4 rounded-2xl bg-card border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Preview & Promotion */}
        {step === 6 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            {/* Ad Preview Card */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">
                Ad Preview
              </h3>
              <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
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
                      {category?.name}
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
                      {form.city}, {form.state}
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-muted text-[10px] font-bold">
                      {subcategory?.name}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {form.description || "No description provided."}
                  </p>
                </div>
              </div>
            </div>

            {/* Promotion Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <div className="h-8 w-8 rounded-xl bg-brand/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-brand" />
                </div>
                <div>
                  <h3 className="text-sm font-black">Boost Visibility</h3>
                  <p className="text-[10px] text-muted-foreground">
                    Get up to 10x more views and sales.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {PROMOS.map((p) => (
                  <button
                    key={p.id}
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
            </div>

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
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border z-30">
          <div className="max-w-md mx-auto flex gap-3">
            {step > 0 && (
              <button
                onClick={prev}
                className="h-14 w-14 rounded-2xl border border-border flex items-center justify-center bg-card transition hover:bg-muted"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            <button
              onClick={next}
              disabled={loading}
              className={`flex-1 h-14 rounded-2xl bg-brand text-brand-foreground font-black shadow-lg shadow-brand/20 flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-50`}
            >
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  {step === STEPS.length - 1 ? "Publish Ad" : "Continue"}
                  {step < STEPS.length - 1 && <ChevronRight className="h-5 w-5" />}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

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
