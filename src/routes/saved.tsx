import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { usePrefs } from "@/lib/prefs";
import { products } from "@/lib/mock-data";
import { Heart, MapPin } from "lucide-react";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved Ads — FarmX" },
      {
        name: "description",
        content: "Your favourite FarmX ads saved for later, with prices and seller locations.",
      },
      { property: "og:title", content: "FarmX Saved Ads" },
      { property: "og:description", content: "Favourite ads saved for later." },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const { t } = useI18n();
  const { saved, toggleSaved } = usePrefs();
  const list = products.filter((p) => saved.includes(p.id));

  return (
    <AppShell title={t("savedAds")}>
      {list.length === 0 ? (
        <div className="py-16 text-center">
          <Heart className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-semibold">{t("savedAds")} — 0</p>
          <Link
            to="/market"
            className="inline-block mt-4 px-4 py-2 rounded-lg bg-brand text-brand-foreground text-sm font-semibold"
          >
            {t("market")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {list.map((p) => (
            <div
              key={p.id}
              className="rounded-xl bg-card border border-border overflow-hidden relative"
            >
              <button
                onClick={() => toggleSaved(p.id)}
                className="absolute top-1.5 right-1.5 z-10 p-1 rounded-full bg-background/80"
              >
                <Heart className="h-4 w-4 fill-brand text-brand" />
              </button>
              <Link to="/product/$id" params={{ id: p.id }}>
                <div className="aspect-square bg-brand/5 flex items-center justify-center text-4xl">
                  {p.image}
                </div>
                <div className="p-2">
                  <p className="text-xs font-semibold truncate">{p.name}</p>
                  <p className="text-xs font-bold text-brand">₦{p.price.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <MapPin className="h-2.5 w-2.5" />
                    {p.location}
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
