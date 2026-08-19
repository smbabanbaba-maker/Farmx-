import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMessages, reportStatusLabel } from "@/lib/messages-store";
import { Flag, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "My reports — Goall26" },
      {
        name: "description",
        content: "Track the status of sellers you reported to Goall26 support.",
      },
      { property: "og:title", content: "Goall26 Reports" },
      { property: "og:description", content: "Follow up on seller reports and safety cases." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { reports } = useMessages();

  return (
    <AppShell title="My reports">
      <div className="space-y-3">
        <div className="flex items-start gap-2 p-3 rounded-xl bg-brand/5 border border-brand/20">
          <ShieldCheck className="h-4 w-4 text-brand shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground">
            Goall26 safety team reviews every report. Keep chats inside the app so we can see the
            evidence.
          </p>
        </div>

        {reports.length === 0 ? (
          <div className="py-16 text-center">
            <Flag className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-semibold">No reports yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Use “Report seller” inside a chat to open a case.
            </p>
            <Link
              to="/messages"
              className="inline-block mt-4 px-4 py-2 rounded-lg bg-brand text-brand-foreground text-sm font-semibold"
            >
              Go to messages
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="rounded-2xl bg-card border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold truncate">{r.seller}</p>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                      r.status === "action_taken"
                        ? "bg-brand/10 text-brand"
                        : r.status === "dismissed"
                          ? "bg-muted text-muted-foreground"
                          : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {reportStatusLabel(r.status)}
                  </span>
                </div>
                <p className="text-xs mt-1 font-semibold">{r.reason}</p>
                {r.details && (
                  <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">
                    {r.details}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Ref {r.reference}</span>
                  <span>{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                {r.conversationId && (
                  <Link
                    to="/messages/$id"
                    params={{ id: r.conversationId }}
                    className="mt-2 inline-block text-[11px] font-semibold text-brand"
                  >
                    Open chat →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
