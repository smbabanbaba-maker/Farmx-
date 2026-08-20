import { createFileRoute, redirect } from "@tanstack/react-router";
import { createSeoHead, organizationJsonLd, websiteJsonLd } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    createSeoHead({
      title: "Goall26 Market — Buy and sell with confidence",
      description:
        "Browse real products, services, equipment, property and businesses on the Goall26 marketplace.",
      path: "/",
      image: "/goall26-logo.png",
      keywords: [
        "Goall26 Market",
        "Nigeria marketplace",
        "buy and sell online",
        "products and services",
      ],
      jsonLd: [organizationJsonLd(), websiteJsonLd()],
    }),
  loader: () => {
    throw redirect({ to: "/market" });
  },
  component: MarketRedirect,
});

function MarketRedirect() {
  return null;
}
