import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useCommerce, DISPUTE_LABEL, type DisputeStatus } from "@/lib/commerce-store";
import { AlertTriangle, Paperclip, Clock } from "lucide-react";

export const Route = createFileRoute("/disputes")({
  head: () => ({
    meta: [
      { title: "Refund Claims & Disputes — Goall26" },
      {
        name: "description",
        content:
          "File a mismatch claim, upload evidence and follow refund status until money returns to your Goall26 wallet.",
      },
      { property: "og:title", content: "Goall26 Disputes & Refunds" },
      {
        property: "og:description",
        content: "Mismatch claims, evidence tracking and refund statuses.",
      },
    ],
  }),
  component: DisputesPage,
});

const FLOW: DisputeStatus[] = ["open", "under_review", "refund_approved", "refunded"];
const COLOR: Record<DisputeStatus, string> = {
  open: "bg-amber-500/15 text-amber-600",
  under_review: "bg-blue-500/15 text-blue-600",
  refund_approved: "bg-indigo-500/15 text-indigo-600",
  refunded: "bg-green-500/15 text-green-600",
  rejected: "bg-muted text-muted-foreground",
};

function DisputesPage() {
  const { t } = useI18n();
  const { disputes, orders, addEvidence, advanceDispute } = useCommerce();
  const [draft, setDraft] = useState<Record<string, string>>({});

  return (
    <AppShell title={t("disputes")}>
      <div className="space-y-3 pb-6">
        {disputes.length === 0 && (
          <div className="text-center py-14">
            <AlertTriangle className="h-10 w-10 text-brand mx-auto" />
            <p className="mt-3 font-semibold">{t("noDisputes")}</p>
            <Link
              to="/orders"
              className="mt-4 inline-block px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-bold"
            >
              {t("orders")}
            </Link>
          </div>
        )}

        {disputes.map((d) => {
          const order = orders.find((o) => o.id === d.orderId);
          const step = FLOW.indexOf(d.status);
          return (
            <div key={d.id} className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{order?.title ?? d.orderId}</p>
                  <p className="text-xs text-muted-foreground">{d.reason}</p>
                </div>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${COLOR[d.status]}`}
                >
                  {DISPUTE_LABEL[d.status]}
                </span>
              </div>

              {/* progress */}
              <div className="mt-3 flex gap-1">
                {FLOW.map((s, i) => (
                  <div
                    key={s}
                    className={`h-1.5 flex-1 rounded-full ${d.status !== "rejected" && i <= step ? "bg-brand" : "bg-accent"}`}
                  />
                ))}
              </div>

              {d.details && <p className="mt-3 text-xs text-muted-foreground">{d.details}</p>}

              <div className="mt-3">
                <p className="text-[11px] font-semibold flex items-center gap-1">
                  <Paperclip className="h-3 w-3" /> {t("evidence")} ({d.evidence.length})
                </p>
                <ul className="mt-1 space-y-0.5">
                  {d.evidence.map((e, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground">
                      • {e}
                    </li>
                  ))}
                </ul>
                {d.status !== "refunded" && d.status !== "rejected" && (
                  <div className="mt-2 flex gap-2">
                    <input
                      value={draft[d.id] ?? ""}
                      onChange={(e) => setDraft({ ...draft, [d.id]: e.target.value })}
                      placeholder={t("addEvidence")}
                      className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-xs"
                    />
                    <button
                      onClick={() => {
                        const v = (draft[d.id] ?? "").trim();
                        if (v) {
                          addEvidence(d.id, v);
                          setDraft({ ...draft, [d.id]: "" });
                        }
                      }}
                      className="px-3 py-2 rounded-lg bg-brand text-brand-foreground text-xs font-bold"
                    >
                      {t("add")}
                    </button>
                  </div>
                )}
              </div>

              <ol className="mt-3 space-y-1">
                {d.updates.map((u, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground flex gap-2">
                    <Clock className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>
                      {u.label} · {new Date(u.at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ol>

              {/* support / admin actions */}
              {d.status !== "refunded" && d.status !== "rejected" && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {d.status === "open" && (
                    <button
                      onClick={() => advanceDispute(d.id, "under_review")}
                      className="py-2 rounded-lg border border-border text-xs font-semibold"
                    >
                      {t("startReview")}
                    </button>
                  )}
                  {d.status === "under_review" && (
                    <button
                      onClick={() => advanceDispute(d.id, "refund_approved")}
                      className="py-2 rounded-lg border border-border text-xs font-semibold"
                    >
                      {t("approveRefund")}
                    </button>
                  )}
                  {d.status === "refund_approved" && (
                    <button
                      onClick={() => advanceDispute(d.id, "refunded")}
                      className="py-2 rounded-lg bg-brand text-brand-foreground text-xs font-bold"
                    >
                      {t("processRefund")}
                    </button>
                  )}
                  <button
                    onClick={() => advanceDispute(d.id, "rejected")}
                    className="py-2 rounded-lg border border-border text-xs font-semibold"
                  >
                    {t("rejectClaim")}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
