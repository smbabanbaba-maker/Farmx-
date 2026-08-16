import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportApplicationError } from "../lib/app-monitoring";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { LocationProvider } from "@/lib/location";
import { CompanyProvider } from "@/lib/company-store";
import { MessagesProvider } from "@/lib/messages-store";
import { SubscriptionProvider } from "@/lib/subscription";
import { PrefsProvider } from "@/lib/prefs";
import { NotificationsProvider } from "@/lib/notifications-store";
import { CommerceProvider } from "@/lib/commerce-store";
import { CommunityProvider } from "@/lib/community-store";
import { getIdToken } from "@/lib/auth";

// Client-side fetch interceptor to inject Cognito ID token into server function calls
if (typeof window !== "undefined") {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const [resource, config] = args;
    const url =
      typeof resource === "string"
        ? resource
        : resource instanceof URL
          ? resource.href
          : resource.url;

    // Only inject token for server function calls or API requests to our own origin
    if (url.includes("/_server") || url.startsWith("/") || url.startsWith(window.location.origin)) {
      try {
        const token = await getIdToken();
        if (token) {
          const newConfig = { ...(config || {}) };
          const headers = new Headers(newConfig.headers || {});
          if (!headers.has("Authorization")) {
            headers.set("Authorization", `Bearer ${token}`);
          }
          newConfig.headers = headers;
          return originalFetch(resource, newConfig);
        }
      } catch (e) {
        console.error("Auth interceptor error:", e);
      }
    }
    return originalFetch(...args);
  };
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-brand">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <Link
          to="/"
          className="mt-6 inline-flex items-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportApplicationError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#dc2626" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <LocationProvider>
            <CompanyProvider>
              <SubscriptionProvider>
                <PrefsProvider>
                  <NotificationsProvider>
                    <CommunityProvider>
                      <CommerceProvider>
                        <MessagesProvider>
                          <Outlet />
                        </MessagesProvider>
                      </CommerceProvider>
                    </CommunityProvider>
                  </NotificationsProvider>
                </PrefsProvider>
              </SubscriptionProvider>
            </CompanyProvider>
          </LocationProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
