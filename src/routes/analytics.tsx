import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TrendingUp, DollarSign, Users, Package } from "lucide-react";

export const Route = createFileRoute("/analytics")({ component: Analytics });

function Analytics() {
  const stats = [
    { icon: DollarSign, label: "Revenue", value: "₦1.2M", change: "+12%" },
    { icon: Package, label: "Orders", value: "348", change: "+8%" },
    { icon: Users, label: "Followers", value: "12.4k", change: "+4%" },
    { icon: TrendingUp, label: "Growth", value: "18%", change: "+2%" },
  ];
  return (
    <AppShell title="Analytics">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="p-4 rounded-xl bg-card border border-border">
              <s.icon className="h-5 w-5 text-brand" />
              <p className="text-xs text-muted-foreground mt-2">{s.label}</p>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-green-600 dark:text-green-400 font-semibold">
                {s.change} this month
              </p>
            </div>
          ))}
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="font-bold mb-3">Sales trend</p>
          <div className="flex items-end gap-2 h-32">
            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-brand to-brand/40 rounded-t"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
