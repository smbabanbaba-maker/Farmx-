import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { confirmSignUp } from "@/lib/auth";
import { ShieldCheck, Mail, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
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
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await confirmSignUp(email, code);
      setSuccess(true);
      setTimeout(() => {
        navigate({ to: "/login" });
      }, 2000);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || "Invalid verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Verify Email">
      <div className="mx-auto max-w-md py-8">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold">Verify Your Email</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              We've sent a code to <span className="font-semibold text-foreground">{email}</span>.
            </p>
          </div>

          {success ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Email Verified!</h2>
                <p className="text-sm text-muted-foreground">Redirecting you to login...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Verification Code
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand"
                    placeholder="123456"
                  />
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
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-brand-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify Email"}
              </button>

              <p className="text-center text-xs text-muted-foreground">
                Didn't receive the code? Check your spam folder or contact support.
              </p>
            </form>
          )}
        </div>
      </div>
    </AppShell>
  );
}
