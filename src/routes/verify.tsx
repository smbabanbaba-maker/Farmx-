import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useCommerce } from "@/lib/commerce-store";
import { BadgeCheck, ShieldCheck, Clock, XCircle, Upload } from "lucide-react";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Seller Verification (KYC) — FarmX" },
      {
        name: "description",
        content:
          "Submit ID and business documents for FarmX seller verification. Only approved sellers receive orders and escrow payments.",
      },
      { property: "og:title", content: "FarmX Seller Verification" },
      {
        property: "og:description",
        content: "KYC review with admin approval unlocks orders and escrow.",
      },
    ],
  }),
  component: VerifyPage,
});

const ID_TYPES = ["NIN", "Passport", "Driver's licence", "Voter's card", "CAC certificate"];

function VerifyPage() {
  const { t } = useI18n();
  const { kyc, submitKyc, reviewKyc, resetKyc } = useCommerce();
  const [f, setF] = useState({
    fullName: kyc.fullName,
    idType: kyc.idType,
    idNumber: kyc.idNumber,
    email: kyc.email,
    phone: kyc.phone,
    businessName: kyc.businessName,
    address: kyc.address,
    documentKey: kyc.documentKey,
  });
  const [err, setErr] = useState<string | null>(null);

  const submit = () => {
    if (!f.fullName.trim()) return setErr(t("kycNeedName"));
    if (!/^\d{6,20}$/.test(f.idNumber)) return setErr(t("kycNeedId"));
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr(t("kycNeedEmail"));
    if (!/^\d{7,15}$/.test(f.phone)) return setErr(t("kycNeedPhone"));
    if (!f.documentKey) return setErr(t("kycNeedDoc"));
    setErr(null);
    submitKyc(f);
  };

  const badge = {
    none: { icon: ShieldCheck, cls: "bg-accent text-muted-foreground", label: t("notSubmitted") },
    pending: { icon: Clock, cls: "bg-amber-500/15 text-amber-600", label: t("awaitingReview") },
    approved: { icon: BadgeCheck, cls: "bg-green-500/15 text-green-600", label: t("approved") },
    rejected: { icon: XCircle, cls: "bg-brand/15 text-brand", label: t("rejected") },
  }[kyc.status];

  return (
    <AppShell title={t("sellerVerification")}>
      <div className="space-y-4 pb-8">
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center gap-2">
            <badge.icon className="h-5 w-5" />
            <span className={`text-xs px-2 py-1 rounded-full font-bold ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("kycGate")}</p>
          {kyc.reviewNote && <p className="mt-2 text-xs text-brand">{kyc.reviewNote}</p>}
          {kyc.submittedAt && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("submitted")}: {new Date(kyc.submittedAt).toLocaleString()}
              {kyc.reviewedAt
                ? ` · ${t("reviewed")}: ${new Date(kyc.reviewedAt).toLocaleString()}`
                : ""}
            </p>
          )}
        </div>

        {kyc.status !== "approved" && (
          <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
            <h2 className="font-bold text-sm">{t("kycForm")}</h2>
            <Input
              label={t("name")}
              value={f.fullName}
              onChange={(v) => setF({ ...f, fullName: v })}
            />
            <div>
              <label className="text-xs font-semibold">{t("idType")}</label>
              <select
                value={f.idType}
                onChange={(e) => setF({ ...f, idType: e.target.value })}
                className="mt-1 w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm"
              >
                {ID_TYPES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </div>
            <Input
              label={t("idNumber")}
              value={f.idNumber}
              onChange={(v) => setF({ ...f, idNumber: v.replace(/\D/g, "") })}
            />
            <Input
              label={t("changeEmail")}
              value={f.email}
              onChange={(v) => setF({ ...f, email: v })}
            />
            <Input
              label={t("phoneNumber")}
              value={f.phone}
              onChange={(v) => setF({ ...f, phone: v.replace(/\D/g, "") })}
            />
            <Input
              label={t("businessInfo")}
              value={f.businessName}
              onChange={(v) => setF({ ...f, businessName: v })}
            />
            <Input
              label={t("address")}
              value={f.address}
              onChange={(v) => setF({ ...f, address: v })}
            />

            <label className="flex items-center gap-2 px-3 py-3 rounded-xl border border-dashed border-border text-xs cursor-pointer">
              <Upload className="h-4 w-4 text-brand" />
              <span className="flex-1 truncate">{f.documentKey || t("uploadDocument")}</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setF({ ...f, documentKey: file.name });
                }}
              />
            </label>

            {err && <p className="text-xs text-brand font-semibold">{err}</p>}
            <button
              onClick={submit}
              className="w-full py-2.5 rounded-xl bg-brand text-brand-foreground text-sm font-bold"
            >
              {kyc.status === "pending" ? t("resubmit") : t("submitForReview")}
            </button>
          </div>
        )}

        {kyc.status === "pending" && (
          <div className="rounded-2xl border border-border p-4">
            <p className="text-xs font-bold">{t("adminReview")}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{t("adminReviewNote")}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => reviewKyc(true)}
                className="py-2 rounded-lg bg-brand text-brand-foreground text-xs font-bold"
              >
                {t("approve")}
              </button>
              <button
                onClick={() => reviewKyc(false, t("rejectNote"))}
                className="py-2 rounded-lg border border-border text-xs font-semibold"
              >
                {t("reject")}
              </button>
            </div>
          </div>
        )}

        {kyc.status === "approved" && (
          <>
            <Link
              to="/orders"
              className="block text-center py-2.5 rounded-xl bg-brand text-brand-foreground text-sm font-bold"
            >
              {t("orders")}
            </Link>
            <button
              onClick={resetKyc}
              className="w-full py-2 rounded-xl border border-border text-xs font-semibold"
            >
              {t("resetVerification")}
            </button>
          </>
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
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm"
      />
    </div>
  );
}
