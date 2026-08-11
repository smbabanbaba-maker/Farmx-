import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Package } from "lucide-react";

export const Route = createFileRoute("/inventory")({ component: Inventory });

function Inventory() {
  const items = [
    { name: "Maize", qty: "2,400 kg", status: "In stock" },
    { name: "Rice", qty: "1,850 kg", status: "In stock" },
    { name: "Fertilizer NPK", qty: "45 bags", status: "Low" },
    { name: "Seeds (Tomato)", qty: "12 kg", status: "Low" },
    { name: "Palm Oil", qty: "320 L", status: "In stock" },
  ];
  return (
    <AppShell title="Inventory">
      <div className="space-y-2">
        {items.map((it) => (
          <div
            key={it.name}
            className="p-3 rounded-xl bg-card border border-border flex items-center gap-3"
          >
            <Package className="h-5 w-5 text-brand" />
            <div className="flex-1">
              <p className="font-semibold text-sm">{it.name}</p>
              <p className="text-xs text-muted-foreground">{it.qty}</p>
            </div>
            <span
              className={`text-xs font-medium ${it.status === "Low" ? "text-brand" : "text-green-600 dark:text-green-400"}`}
            >
              {it.status}
            </span>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
