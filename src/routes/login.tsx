import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, LogIn, Mail, X } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import {
  getCognitoHostedUiLoginUrl,
  getFriendlyAuthError,
  isSixDigitPassword,
  PASSWORD_LENGTH,
  requestPasswordReset,
  signIn,
} from "@/lib/auth";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ returnTo: z.string().optional() }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { returnTo } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  const handleHostedLogin = () => {
    setError(null);
    setSocialLoading(true);
    try {
      window.location.assign(getCognitoHostedUiLoginUrl("Google"));
    } catch (reason) {
      setSocialLoading(false);
      setError(
        reason instanceof Error
          ? reason.message
          : "Google sign-in is not configured for this Goall26 deployment.",
      );
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Enter your email address.");
      return;
    }
    const normalizedPassword = password
      .trim()
      .replace(/[^0-9]/g, "")
      .slice(0, PASSWORD_LENGTH);
    if (!isSixDigitPassword(normalizedPassword)) {
      setError("Password must contain exactly 6 digits.");
      return;
    }
    setLoading(true);
    try {
      await signIn(normalizedEmail, normalizedPassword);
      if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
        window.location.assign(returnTo);
      } else {
        await navigate({ to: "/profile" });
      }
    } catch (authError) {
      setError(getFriendlyAuthError(authError, "signin"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Sign In">
      <div className="mx-auto max-w-md py-8">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <LogIn className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold">Welcome Back</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to manage your farm and marketplace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Email Address
              </span>
              <span className="relative block">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand"
                  placeholder="name@example.com"
                />
              </span>
            </label>

            <label className="block space-y-1.5">
              <span className="flex items-center justify-between px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span>Password</span>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setForgotOpen(true);
                  }}
                  className="normal-case tracking-normal text-[10px] font-bold text-brand hover:underline"
                >
                  Forgot password?
                </button>
              </span>
              <span className="relative block">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value.replace(/\D/g, "").slice(0, PASSWORD_LENGTH))
                  }
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  minLength={PASSWORD_LENGTH}
                  maxLength={PASSWORD_LENGTH}
                  className="h-11 w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-11 text-sm tracking-[0.35em] outline-none focus:border-brand"
                  placeholder="••••••"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
              <span className="block px-1 text-[10px] text-muted-foreground">
                Use exactly 6 digits.
              </span>
            </label>

            {error && <InlineError>{error}</InlineError>}
            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-brand-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </button>
          </form>

          <div className="mt-6 border-t border-border pt-5">
            <button
              type="button"
              onClick={handleHostedLogin}
              disabled={socialLoading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-accent disabled:opacity-60"
            >
              {socialLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
              Continue with Google
            </button>
          </div>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/signup" className="font-bold text-brand hover:underline">
              Create one here
            </Link>
          </div>
        </div>
      </div>

      {forgotOpen && (
        <ForgotPasswordDialog
          initialEmail={email}
          onClose={() => setForgotOpen(false)}
          onSent={(resetEmail) =>
            navigate({ to: "/reset-password", search: { email: resetEmail } })
          }
        />
      )}
    </AppShell>
  );
}

function ForgotPasswordDialog({
  initialEmail,
  onClose,
  onSent,
}: {
  initialEmail: string;
  onClose: () => void;
  onSent: (email: string) => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!z.string().email().safeParse(normalizedEmail).success) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await requestPasswordReset(normalizedEmail);
      setMessage("A 6-digit verification code was sent to your email.");
      window.setTimeout(() => onSent(normalizedEmail), 500);
    } catch (authError) {
      setError(getFriendlyAuthError(authError, "reset"));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="forgot-password-title" className="text-lg font-black">
              Reset your password
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Enter your account email and Goall26 will send a 6-digit verification code.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold">Email address</span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand"
              placeholder="name@example.com"
            />
          </label>
          {error && <InlineError>{error}</InlineError>}
          {message && (
            <div
              className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900"
              role="status"
            >
              {message}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-brand-foreground disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send verification code"}
          </button>
        </form>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.15C3.15 21.32 7.23 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.18C.43 8.12 0 9.81 0 12s.43 3.88 1.18 5.39l4.09-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.15 2.68 1.18 6.61l4.09 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

function InlineError({ children }: { children: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl bg-brand/5 p-3 text-xs font-semibold text-brand"
      role="alert"
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      {children}
    </div>
  );
}
