import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { tutorials } from "@/lib/mock-data";
import { PlayCircle, Award } from "lucide-react";

export const Route = createFileRoute("/learn")({ component: Learn });

function Learn() {
  const { t } = useI18n();
  return (
    <AppShell title={t("learn")}>
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-brand to-black text-white flex items-center gap-3">
          <Award className="h-8 w-8" />
          <div>
            <p className="font-bold">Get Certified</p>
            <p className="text-xs text-white/80">Complete tutorials to earn FarmX badges</p>
          </div>
        </div>
        <div className="space-y-2">
          {tutorials.map((tu) => (
            <div
              key={tu.id}
              className="p-4 rounded-xl bg-card border border-border flex items-center gap-3"
            >
              <div className="text-3xl">{tu.icon}</div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{tu.title}</p>
                <p className="text-xs text-muted-foreground">
                  {tu.duration} · {tu.level}
                </p>
              </div>
              <PlayCircle className="h-6 w-6 text-brand" />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
