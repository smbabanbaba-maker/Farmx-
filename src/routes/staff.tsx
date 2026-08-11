import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/staff")({ component: Staff });

function Staff() {
  const staff = [
    { name: "Aisha Mohammed", role: "Farm Manager", initials: "AM" },
    { name: "Yusuf Sani", role: "Field Supervisor", initials: "YS" },
    { name: "Grace Okon", role: "Accountant", initials: "GO" },
    { name: "Danladi Musa", role: "Driver", initials: "DM" },
  ];
  return (
    <AppShell title="Staff">
      <div className="space-y-2">
        {staff.map((s) => (
          <div
            key={s.name}
            className="p-3 rounded-xl bg-card border border-border flex items-center gap-3"
          >
            <div className="h-10 w-10 rounded-full bg-brand text-brand-foreground flex items-center justify-center font-bold text-sm">
              {s.initials}
            </div>
            <div>
              <p className="font-semibold text-sm">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.role}</p>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
