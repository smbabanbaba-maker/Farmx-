import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { exchangeCognitoHostedUiCode } from "@/lib/auth";

export const Route = createFileRoute("/oauth/callback")({
  validateSearch: z.object({
    code: z.string().optional(),
    error: z.string().optional(),
    error_description: z.string().optional(),
  }),
  component: OAuthCallbackPage,
});

function OAuthCallbackPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [error, setError] = useState<string | null>(
    search.error_description ?? search.error ?? null,
  );

  useEffect(() => {
    if (search.error || !search.code) return;
    let active = true;
    void exchangeCognitoHostedUiCode(search.code)
      .then(() => {
        if (active) void navigate({ to: "/profile" });
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error ? reason.message : "Google sign-in could not be completed.",
          );
      });
    return () => {
      active = false;
    };
  }, [navigate, search.code, search.error]);

  return (
    <AppShell title="Sign In">
      <div className="mx-auto max-w-md py-12">
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          {error ? (
            <>
              <AlertCircle className="mx-auto h-10 w-10 text-brand" />
              <h1 className="mt-4 text-lg font-black">Sign-in could not be completed</h1>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              <button
                type="button"
                onClick={() => navigate({ to: "/login" })}
                className="mt-5 h-11 w-full rounded-xl bg-brand text-sm font-black text-brand-foreground"
              >
                Return to Sign In
              </button>
            </>
          ) : (
            <>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand" />
              <h1 className="mt-4 text-lg font-black">Completing secure sign-in…</h1>
              <p className="mt-2 text-sm text-muted-foreground">FarmX is loading your account.</p>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
