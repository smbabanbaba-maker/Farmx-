import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { ShieldCheck, Truck, RotateCcw, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/buyer-protection")({
  head: () => ({
    meta: [
      { title: "Buyer Protection — Goall26" },
      {
        name: "description",
        content:
          "Goall26 escrow payments, pay on delivery and refund policy protect every purchase from verified sellers.",
      },
      { property: "og:title", content: "Goall26 Buyer Protection" },
      { property: "og:description", content: "Escrow, pay on delivery and refunds on Goall26." },
    ],
  }),
  component: BuyerProtection,
});

function BuyerProtection() {
  const { t } = useI18n();
  const cards = [
    { icon: ShieldCheck, title: t("escrow"), body: t("escrowDesc") },
    { icon: Truck, title: t("payOnDelivery"), body: t("escrowDesc") },
    { icon: RotateCcw, title: t("refundPolicy"), body: t("refundDesc") },
    { icon: BadgeCheck, title: t("verifiedBadge"), body: t("verifiedOnly") },
  ];
  return (
    <AppShell title={t("buyerProtection")}>
      <div className="space-y-3">
        {cards.map((c) => (
          <div key={c.title} className="p-4 rounded-2xl bg-card border border-border flex gap-3">
            <c.icon className="h-5 w-5 text-brand shrink-0" />
            <div>
              <p className="font-semibold text-sm">{c.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.body}</p>
            </div>
          </div>
        ))}
        <Link
          to="/market"
          className="block text-center py-2.5 rounded-xl bg-brand text-brand-foreground text-sm font-bold"
        >
          {t("market")}
        </Link>
      </div>
    </AppShell>
  );
}
