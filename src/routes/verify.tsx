import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { getMyVerification, submitVerification } from "@/lib/profile.functions";
import { uploadFileToS3 } from "@/lib/s3-client";
import { BadgeCheck, Clock, Loader2, ShieldCheck, Upload, XCircle } from "lucide-react";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Seller Verification (KYC) — Goall26" },
      {
        name: "description",
        content: "Submit identity and business documents for Goall26 seller verification.",
      },
    ],
  }),
  component: VerifyPage,
});

const ID_TYPES = ["NIN", "Passport", "Driver's licence", "Voter's card", "CAC certificate"];
type VerificationStatus = "not_started" | "pending" | "approved" | "rejected" | "more_information";
type VerificationForm = {
  fullName: string;
  idType: string;
  idNumber: string;
  email: string;
  phone: string;
  businessName: string;
  address: string;
  documentKey: string;
};

type VerificationDetails = VerificationForm & {
  submittedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
};

const emptyForm: VerificationForm = {
  fullName: "",
  idType: ID_TYPES[0],
  idNumber: "",
  email: "",
  phone: "",
  businessName: "",
  address: "",
  documentKey: "",
};

function VerifyPage() {
  const { t } = useI18n();
  const [status, setStatus] = useState<VerificationStatus>("not_started");
  const [details, setDetails] = useState<VerificationDetails | null>(null);
  const [form, setForm] = useState<VerificationForm>(emptyForm);
  const [documentName, setDocumentName] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getMyVerification()
      .then((result) => {
        if (!active) return;
        const nextStatus = String(result.status) as VerificationStatus;
        const nextDetails = result.details as VerificationDetails | null;
        setStatus(nextStatus);
        setDetails(nextDetails);
        if (nextDetails) {
          setForm({
            fullName: nextDetails.fullName,
            idType: nextDetails.idType,
            idNumber: nextDetails.idNumber,
            email: nextDetails.email,
            phone: nextDetails.phone,
            businessName: nextDetails.businessName,
            address: nextDetails.address,
            documentKey: nextDetails.documentKey,
          });
          setDocumentName("Document uploaded");
        }
      })
      .catch(() => {
        if (active) setErr("Unable to load verification status. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const update = (key: keyof VerificationForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleDocument = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setErr("The verification document must be 10 MB or smaller.");
      return;
    }
    const contentType = (file.type || "").split(";")[0].toLowerCase();
    if (
      !contentType ||
      !(["image/jpeg", "image/png", "image/webp", "application/pdf"] as string[]).includes(
        contentType,
      )
    ) {
      setErr("Upload a JPG, PNG, WEBP, or PDF document.");
      return;
    }
    setErr(null);
    setUploading(true);
    try {
      const uploaded = await uploadFileToS3("verification", file);
      update("documentKey", uploaded.objectKey);
      setDocumentName(file.name);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Document upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!form.fullName.trim()) return setErr(t("kycNeedName"));
    if (!/^\d{6,20}$/.test(form.idNumber)) return setErr(t("kycNeedId"));
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setErr(t("kycNeedEmail"));
    if (!/^\d{7,15}$/.test(form.phone)) return setErr(t("kycNeedPhone"));
    if (!form.businessName.trim() || !form.address.trim())
      return setErr("Business name and address are required.");
    if (!form.documentKey) return setErr(t("kycNeedDoc"));
    setErr(null);
    setSubmitting(true);
    try {
      const result = await submitVerification({ data: form });
      setStatus(result.status);
      setDetails(result.details as VerificationDetails);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusMeta = {
    not_started: {
      icon: ShieldCheck,
      cls: "bg-accent text-muted-foreground",
      label: t("notSubmitted"),
    },
    pending: { icon: Clock, cls: "bg-amber-500/15 text-amber-600", label: t("awaitingReview") },
    approved: { icon: BadgeCheck, cls: "bg-green-500/15 text-green-600", label: t("approved") },
    rejected: { icon: XCircle, cls: "bg-brand/15 text-brand", label: t("rejected") },
    more_information: {
      icon: Clock,
      cls: "bg-amber-500/15 text-amber-600",
      label: "More information required",
    },
  }[status];
  const StatusIcon = statusMeta.icon;

  if (loading) {
    return (
      <AppShell title={t("sellerVerification")}>
        <div className="flex min-h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={t("sellerVerification")}>
      <div className="space-y-4 pb-8">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <StatusIcon className="h-5 w-5" />
            <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusMeta.cls}`}>
              {statusMeta.label}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("kycGate")}</p>
          {details?.reviewNote && (
            <p className="mt-2 text-xs font-semibold text-brand">{details.reviewNote}</p>
          )}
          {details?.submittedAt && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("submitted")}: {new Date(details.submittedAt).toLocaleString()}
            </p>
          )}
        </div>

        {status === "approved" ? (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-5 text-center">
            <BadgeCheck className="mx-auto h-10 w-10 text-green-600" />
            <p className="mt-2 text-sm font-bold text-green-800">{t("approved")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your verification was reviewed and approved by Goall26.
            </p>
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-bold">
              {status === "pending" ? "Verification under review" : t("kycForm")}
            </h2>
            <Input
              label={t("name")}
              value={form.fullName}
              onChange={(v) => update("fullName", v)}
            />
            <div>
              <label className="text-xs font-semibold">{t("idType")}</label>
              <select
                value={form.idType}
                onChange={(e) => update("idType", e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              >
                {ID_TYPES.map((idType) => (
                  <option key={idType}>{idType}</option>
                ))}
              </select>
            </div>
            <Input
              label={t("idNumber")}
              value={form.idNumber}
              onChange={(v) => update("idNumber", v.replace(/\D/g, ""))}
            />
            <Input
              label={t("changeEmail")}
              value={form.email}
              onChange={(v) => update("email", v)}
            />
            <Input
              label={t("phoneNumber")}
              value={form.phone}
              onChange={(v) => update("phone", v.replace(/\D/g, ""))}
            />
            <Input
              label={t("businessInfo")}
              value={form.businessName}
              onChange={(v) => update("businessName", v)}
            />
            <Input
              label={t("address")}
              value={form.address}
              onChange={(v) => update("address", v)}
            />
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-3 py-3 text-xs">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-brand" />
              ) : (
                <Upload className="h-4 w-4 text-brand" />
              )}
              <span className="flex-1 truncate">{documentName || t("uploadDocument")}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                disabled={uploading || submitting}
                onChange={(e) => void handleDocument(e.target.files?.[0])}
              />
            </label>
            {err && <p className="text-xs font-semibold text-brand">{err}</p>}
            <button
              type="button"
              onClick={() => void submit()}
              disabled={uploading || submitting || status === "pending"}
              className="w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-brand-foreground disabled:opacity-60"
            >
              {submitting
                ? "Submitting..."
                : status === "pending"
                  ? "Awaiting review"
                  : t("submitForReview")}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
      />
    </div>
  );
}
