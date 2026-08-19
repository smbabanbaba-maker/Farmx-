import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import {
  confirmPasswordReset,
  getFriendlyAuthError,
  isSixDigitPassword,
  requestPasswordReset,
} from "@/lib/auth";

export const Route = createFileRoute("/reset-password")({
  validateSearch: z.object({ email: z.string().email().optional() }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [email, setEmail] = useState(search.email ?? "");
  const [codeSent, setCodeSent] = useState(Boolean(search.email));
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [cooldown, setCooldown] = useState(search.email ? 30 : 0);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const handleOtpChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, "");
    const next = [...otp];
    if (digits.length > 1) {
      const pasted = digits.slice(0, 6).split("");
      pasted.forEach((digit, offset) => {
        if (index + offset < 6) next[index + offset] = digit;
      });
      setOtp(next);
      inputRefs.current[Math.min(index + pasted.length, 5)]?.focus();
      return;
    }
    next[index] = digits;
    setOtp(next);
    if (digits && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    setOtp([...pasted.split(""), ...Array(6 - pasted.length).fill("")]);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const normalizedEmail = email.trim().toLowerCase();
    const code = otp.join("");
    if (!z.string().email().safeParse(normalizedEmail).success) {
      setError("Enter the email address linked to your Goall26 account.");
      return;
    }
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError("Enter the complete 6-digit verification code.");
      return;
    }
    if (!isSixDigitPassword(newPassword)) {
      setError("Your new password must contain exactly 6 digits.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(normalizedEmail, code, newPassword);
      setSuccess(true);
    } catch (authError) {
      setError(getFriendlyAuthError(authError, "confirm"));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!z.string().email().safeParse(normalizedEmail).success) {
      setError("Enter a valid email address before requesting a code.");
      return;
    }
    if (cooldown > 0) return;
    setResending(true);
    setError(null);
    setMessage(null);
    try {
      await requestPasswordReset(normalizedEmail);
      setCodeSent(true);
      setCooldown(30);
      setMessage("A new 6-digit verification code was sent.");
    } catch (authError) {
      setError(getFriendlyAuthError(authError, "reset"));
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <AppShell title="Password Reset">
        <div className="mx-auto max-w-md py-8">
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h1 className="mt-4 text-xl font-black">Your password has been reset successfully.</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Use your new 6-digit password to continue to Goall26.
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/login" })}
              className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-brand text-sm font-black text-brand-foreground"
            >
              Continue to Sign In
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Reset Password">
      <div className="mx-auto max-w-md py-8">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-black">Reset your password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {codeSent
                ? "Enter the verification code we sent to your email."
                : "Enter your email to receive a verification code."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!codeSent && (
              <label className="block space-y-1.5">
                <span className="text-xs font-bold">Email address</span>
                <span className="relative block">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    autoFocus
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-brand"
                    placeholder="name@example.com"
                  />
                </span>
              </label>
            )}

            {codeSent && (
              <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5 text-xs">
                <span className="truncate text-muted-foreground">
                  Code sent to <strong className="text-foreground">{email}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCodeSent(false);
                    setOtp(["", "", "", "", "", ""]);
                    setMessage(null);
                    setError(null);
                  }}
                  className="ml-3 shrink-0 font-black text-brand"
                >
                  Change email
                </button>
              </div>
            )}

            {codeSent && (
              <label className="block space-y-2">
                <span className="block text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  6-digit verification code
                </span>
                <div className="flex justify-center gap-1.5 sm:gap-2" onPaste={handleOtpPaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        inputRefs.current[index] = element;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      maxLength={1}
                      value={digit}
                      onChange={(event) => handleOtpChange(index, event.target.value)}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      aria-label={`Verification code digit ${index + 1}`}
                      className="h-11 w-10 rounded-xl border border-border bg-background text-center text-lg font-black outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 sm:w-11"
                    />
                  ))}
                </div>
              </label>
            )}

            {codeSent && (
              <PasswordField
                label="New password"
                value={newPassword}
                onChange={(value) => setNewPassword(value.replace(/\D/g, "").slice(0, 6))}
                visible={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                autoComplete="new-password"
              />
            )}
            {codeSent && (
              <PasswordField
                label="Confirm new password"
                value={confirmPassword}
                onChange={(value) => setConfirmPassword(value.replace(/\D/g, "").slice(0, 6))}
                visible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((value) => !value)}
                autoComplete="new-password"
              />
            )}
            {codeSent && (
              <p className="text-[11px] text-muted-foreground">
                Password requirement: exactly 6 digits.
              </p>
            )}
            {error && <InlineError>{error}</InlineError>}
            {message && (
              <div
                className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900"
                role="status"
              >
                {message}
              </div>
            )}

            {codeSent ? (
              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-black text-brand-foreground disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset password"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void resend()}
                disabled={resending}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-black text-brand-foreground disabled:opacity-50"
              >
                {resending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Send verification code"
                )}
              </button>
            )}
          </form>

          {codeSent && (
            <div className="mt-5 text-center text-xs text-muted-foreground">
              {cooldown > 0 ? (
                <span>
                  Resend code in <strong className="text-foreground">{cooldown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => void resend()}
                  disabled={resending}
                  className="inline-flex items-center gap-1 font-black text-brand"
                >
                  <RefreshCw className="h-3 w-3" /> Resend code
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  autoComplete: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold">{label}</span>
      <span className="relative block">
        <input
          type={visible ? "text" : "password"}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="numeric"
          autoComplete={autoComplete}
          maxLength={6}
          pattern="[0-9]{6}"
          className="h-11 w-full rounded-xl border border-border bg-background px-3 pr-11 text-sm tracking-[0.35em] outline-none focus:border-brand"
          placeholder="••••••"
        />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={onToggle}
          className="absolute right-3 top-2.5 text-muted-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
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
