import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — FarmX Help Centre" },
      {
        name: "description",
        content:
          "Answers about FarmX listings, subscription plans, escrow payments, verification and refunds.",
      },
      { property: "og:title", content: "FarmX FAQ" },
      { property: "og:description", content: "Listings, plans, escrow and verification answers." },
    ],
  }),
  component: FaqPage,
});

const ITEMS = [
  {
    q: "How many free ads do I get?",
    a: "Every account gets 5 free listings. After that you choose a subscription plan.",
  },
  {
    q: "How do installments work?",
    a: "Each monthly plan is split into 2 equal installments. You pay the first to activate, the second within the month.",
  },
  {
    q: "What is escrow?",
    a: "FarmX holds the buyer's money until delivery is confirmed. Only verified sellers can use escrow.",
  },
  {
    q: "How do I get the verified badge?",
    a: "Complete KYC (ID, email, phone) in the Upgrade section.",
  },
  {
    q: "Can I get a refund?",
    a: "Yes — if the product does not match the description, escrow funds are refunded in full.",
  },
];

function FaqPage() {
  const { t } = useI18n();
  return (
    <AppShell title={t("faq")}>
      <div className="space-y-2">
        {ITEMS.map((i) => (
          <details key={i.q} className="p-3 rounded-xl bg-card border border-border">
            <summary className="text-sm font-semibold cursor-pointer">{i.q}</summary>
            <p className="mt-2 text-xs text-muted-foreground">{i.a}</p>
          </details>
        ))}
      </div>
    </AppShell>
  );
}
