import { X, Wallet as WalletIcon, CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";
import { initPayment, type PaymentPurpose } from "@/lib/paystack";
import { getCurrentSession } from "@/lib/auth";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  amountNaira: number;
  purpose: PaymentPurpose;
  walletBalance?: number;
  onPaid?: (via: "wallet" | "paystack", reference: string) => void;
}

export function PayModal({
  open,
  onClose,
  title,
  amountNaira,
  purpose,
  walletBalance = 0,
  onPaid,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!open) return null;

  const payWithWallet = () => {
    if (walletBalance < amountNaira) {
      setMsg("Wallet balance bai isa ba. Sai ka yi top-up.");
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      onPaid?.("wallet", `wallet_${Date.now()}`);
      onClose();
    }, 700);
  };

  const payWithPaystack = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const session = await getCurrentSession();
      const email = session?.getIdToken().payload.email;
      if (typeof email !== "string" || !email) {
        throw new Error("Please sign in with a verified FarmX account before paying.");
      }
      const res = await initPayment({ email, amountNaira, purpose });
      if (!res.authorization_url.startsWith("http")) {
        throw new Error("Paystack did not return a valid checkout URL.");
      }
      window.location.href = res.authorization_url;
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold">{title}</h3>
            <p className="text-2xl font-bold text-brand mt-1">₦{amountNaira.toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 mt-2">
          <button
            onClick={payWithWallet}
            disabled={busy}
            className="w-full p-3 rounded-xl border border-border flex items-center gap-3 hover:border-brand disabled:opacity-50"
          >
            <div className="h-9 w-9 rounded-full bg-brand/10 flex items-center justify-center">
              <WalletIcon className="h-4 w-4 text-brand" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold">FarmX Wallet</p>
              <p className="text-xs text-muted-foreground">
                Balance: ₦{walletBalance.toLocaleString()}
              </p>
            </div>
          </button>

          <button
            onClick={payWithPaystack}
            disabled={busy}
            className="w-full p-3 rounded-xl border border-border flex items-center gap-3 hover:border-brand disabled:opacity-50"
          >
            <div className="h-9 w-9 rounded-full bg-brand/10 flex items-center justify-center">
              {busy ? (
                <Loader2 className="h-4 w-4 text-brand animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 text-brand" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold">Paystack (Card / Bank / USSD)</p>
              <p className="text-xs text-muted-foreground">Fallback idan wallet ba ta shirya ba</p>
            </div>
          </button>
        </div>

        {msg && <p className="mt-3 text-xs text-brand">{msg}</p>}
        <p className="mt-4 text-[10px] text-muted-foreground">
          Ana amfani da AWS backend don verify kowace biya kafin a kunna listing / subscription.
        </p>
      </div>
    </div>
  );
}
