import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
    } catch (err: any) {
      setError(err.message || "Invalid verification code.");
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
            <h1 className="text-xl font-bold">Verify your email</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a code to <span className="font-bold text-foreground">{email}</span>.
            </p>
          </div>

          {success ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold">Email Verified!</h2>
              <p className="mt-1 text-sm text-muted-foreground">Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center block">
                  Verification Code
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full text-center text-2xl font-black tracking-[0.5em] rounded-xl border border-border bg-background py-3 outline-none focus:border-brand"
                  placeholder="000000"
                  maxLength={6}
                />
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
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Continue"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-muted-foreground">
            Didn't receive a code? Check your spam folder or{" "}
            <button className="font-bold text-brand hover:underline">Resend code</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
