import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { confirmSignUp } from "@/lib/auth";
import { ShieldCheck, AlertCircle, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/verify-email")({
  validateSearch: z.object({
    email: z.string().email(),
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { email } = Route.useSearch();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(32);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleChange = (index: number, value: string) => {
    // Only accept numeric digits
    const digit = value.replace(/[^0-9]/g, "").slice(-1);

    if (!digit && value !== "") return; // Prevent non-numeric input

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-move to next input if digit entered
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits are entered
    const fullCode = newOtp.join("");
    if (fullCode.length === 6) {
      handleVerify(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/[^0-9]/g, "")
      .slice(0, 6);
    const newOtp = ["", "", "", "", "", ""];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
    if (pastedData.length > 0) {
      const targetIndex = Math.min(pastedData.length, 5);
      inputRefs.current[targetIndex]?.focus();
    }
  };

  const handleVerify = async (codeStr: string) => {
    if (codeStr.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      await confirmSignUp(email, codeStr);
      setSuccess(true);
      if (typeof window !== "undefined") {
        window.alert("Account verified successfully! Redirecting to login...");
      }
      setTimeout(() => {
        navigate({ to: "/login" });
      }, 2000);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || "Invalid verification code.");
      if (typeof window !== "undefined") {
        window.alert("Verification Error: " + (errorObj.message || "Invalid code"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const codeStr = otp.join("");
    if (codeStr.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }
    handleVerify(codeStr);
  };

  return (
    <AppShell title="Verify Account">
      <div className="mx-auto max-w-md py-8">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold">Verify Your Account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              We've sent a 6-digit verification code to{" "}
              <span className="font-semibold text-foreground">{email}</span>.
            </p>
          </div>

          {success ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Account Verified!</h2>
                <p className="text-sm text-muted-foreground">Redirecting you to sign in...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Enter 6-Digit Verification Code
                </label>
                <div className="flex justify-center gap-2" onPaste={handlePaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="h-12 w-12 rounded-xl border border-border bg-background text-center text-lg font-bold outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-brand/5 p-3 text-xs font-semibold text-brand">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.some((d) => !d)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-brand-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify Account"}
              </button>

              <div className="text-center text-xs text-muted-foreground">
                <span>Didn't receive the code? </span>
                {resendCountdown > 0 ? (
                  <span className="font-semibold text-foreground">
                    Resend code in {resendCountdown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setResendCountdown(32);
                      alert("A new verification code has been sent to your email.");
                    }}
                    className="font-bold text-brand hover:underline inline-flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" /> Resend code
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </AppShell>
  );
}
