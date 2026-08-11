import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { transactions } from "@/lib/mock-data";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/wallet")({ component: WalletPage });

function WalletPage() {
  const { t } = useI18n();
  const [hidden, setHidden] = useState(false);
  return (
    <AppShell title={t("wallet")}>
      <div className="space-y-4">
        <div className="rounded-2xl p-5 bg-gradient-to-br from-black to-brand text-white shadow-lg">
          <div className="flex items-center justify-between text-white/80 text-xs uppercase tracking-wide">
            <span>{t("balance")}</span>
            <button onClick={() => setHidden(!hidden)}>
              {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-2 text-3xl font-bold">{hidden ? "••••••" : "₦248,500.00"}</div>
          <div className="mt-1 text-xs text-white/70">FarmX Wallet · **** 4821</div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: ArrowDownLeft, label: t("deposit") },
            { icon: ArrowLeftRight, label: t("transfer") },
            { icon: ArrowUpRight, label: t("withdraw") },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-card border border-border hover:border-brand"
            >
              <div className="h-9 w-9 rounded-full bg-brand/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-brand" />
              </div>
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>

        <div>
          <h2 className="font-bold mb-2">Transactions</h2>
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3 rounded-xl bg-card border border-border flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{tx.label}</p>
                  <p className="text-xs text-muted-foreground">{tx.date}</p>
                </div>
                <span
                  className={`text-sm font-bold ${tx.amount > 0 ? "text-green-600 dark:text-green-400" : "text-brand"}`}
                >
                  {tx.amount > 0 ? "+" : ""}₦{Math.abs(tx.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
