import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Truck, MapPin } from "lucide-react";

export const Route = createFileRoute("/fleet")({ component: Fleet });

function Fleet() {
  const vehicles = [
    { id: "FX-001", type: "Tractor", status: "Active", location: "Field A" },
    { id: "FX-002", type: "Truck", status: "In transit", location: "Kano → Lagos" },
    { id: "FX-003", type: "Harvester", status: "Idle", location: "Depot" },
  ];
  return (
    <AppShell title="Fleet">
      <div className="space-y-2">
        {vehicles.map((v) => (
          <div
            key={v.id}
            className="p-4 rounded-xl bg-card border border-border flex items-center gap-3"
          >
            <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center">
              <Truck className="h-5 w-5 text-brand" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {v.type} · {v.id}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {v.location}
              </p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-brand/10 text-brand font-medium">
              {v.status}
            </span>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
