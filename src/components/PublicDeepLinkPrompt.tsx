import { useEffect, useState } from "react";
import { ExternalLink, Smartphone } from "lucide-react";

type PublicDeepLinkPromptProps = {
  path: string;
  title: string;
};

function appDeepLink(path: string) {
  const scheme = (import.meta.env.VITE_FARMX_APP_SCHEME as string | undefined)?.replace(
    /:\/\/$/,
    "",
  );
  if (!scheme) return null;
  return `${scheme}://${path.replace(/^\//, "")}`;
}

function isMobileBrowser() {
  return typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function PublicDeepLinkPrompt({ path, title }: PublicDeepLinkPromptProps) {
  const [deepLink] = useState(() => appDeepLink(path));
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (!deepLink || !isMobileBrowser()) return;
    if (import.meta.env.VITE_FARMX_AUTO_DEEP_LINK !== "true") return;
    let active = true;
    const timer = window.setTimeout(() => {
      if (!active) return;
      window.location.assign(deepLink);
      window.setTimeout(() => {
        if (active) setShowFallback(true);
      }, 800);
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [deepLink]);

  if (!deepLink) return null;
  return (
    <section className="rounded-2xl border border-brand/20 bg-brand/5 p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground">
          <Smartphone className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black">Continue in the Goall26 app</p>
          <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
            {showFallback
              ? `If the app is not installed, continue viewing ${title} here.`
              : "Open this public page in Goall26 when the app is installed."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.assign(deepLink)}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-brand px-2.5 py-2 text-[10px] font-bold text-brand-foreground"
        >
          Open app <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </section>
  );
}
