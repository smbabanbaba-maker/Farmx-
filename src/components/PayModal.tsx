import { X, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { initPayment, type PaymentPurpose } from "@/lib/paystack";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  amountNaira: number;
  purpose: PaymentPurpose;
  onPaid?: (via: "paystack", reference: string) => void | Promise<void>;
}

export function PayModal({ open, onClose, title, amountNaira, purpose, onPaid }: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!open) return null;

  const payWithPaystack = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const transaction = await initPayment({ email: "user@example.com", amountNaira, purpose });
      if (!transaction.authorization_url.startsWith("http")) {
        throw new Error(
          "Paystack is not configured yet. Add VITE_API_BASE_URL and AWS payment endpoints before accepting payments.",
        );
      }
      window.location.assign(transaction.authorization_url);
      await onPaid?.("paystack", transaction.reference);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Unable to start Paystack checkout.");
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
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Secure Paystack checkout
            </p>
            <h3 className="mt-1 font-bold">{title}</h3>
            <p className="text-2xl font-bold text-brand mt-1">₦{amountNaira.toLocaleString()}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-accent"
            aria-label="Close payment"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-xl border border-brand/20 bg-brand/5 p-3 text-xs text-muted-foreground">
          <p className="font-bold text-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-brand" /> Pay safely with Paystack
          </p>
          <p className="mt-1 leading-5">
            Pay by card, bank transfer or USSD through Paystack. FarmX only activates a listing
            after server-side payment verification.
          </p>
        </div>

        <button
          onClick={() => void payWithPaystack()}
          disabled={busy}
          className="mt-3 w-full p-3 rounded-xl bg-brand text-brand-foreground flex items-center justify-center gap-3 font-bold disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}{" "}
          Continue to Paystack
        </button>
        {msg && (
          <p role="alert" className="mt-3 text-xs text-brand">
            {msg}
          </p>
        )}
        <p className="mt-4 text-[10px] text-muted-foreground">
          Your payment is verified by the FarmX AWS backend before any listing, boost or
          subscription is activated.
        </p>
      </div>
    </div>
  );
}
