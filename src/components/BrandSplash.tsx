import { useRouterState } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";

const LOGO = "/farmx-logo.png";

// Global tracker to ensure splash only shows once and isn't reset by re-mounts
let globalBooted = false;

/**
 * FarmX brand splash:
 *  - First app open: full screen, centered FarmX logo (~1.8s)
 *  - Every route change afterwards: quick logo flash (~0.7s)
 */
export function BrandSplash() {
  // Use try-catch or safe access for router state
  let pathname = "/";
  try {
    const state = useRouterState({ select: (s) => s.location.pathname });
    pathname = state;
  } catch (e) {
    // Router not ready
  }

  const [visible, setVisible] = useState(!globalBooted);
  const [phase, setPhase] = useState<"boot" | "flash">("boot");
  const lastPath = useRef(pathname);

  useEffect(() => {
    if (globalBooted) {
      setVisible(false);
      return;
    }

    const t = setTimeout(() => {
      globalBooted = true;
      setVisible(false);
    }, 2000); // Slightly longer to ensure stability

    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!globalBooted || pathname === lastPath.current) return;
    lastPath.current = pathname;

    setPhase("flash");
    setVisible(true);

    const t = setTimeout(() => {
      setVisible(false);
    }, 700);

    return () => clearTimeout(t);
  }, [pathname]);

  if (!visible) return null;

  const isBoot = !globalBooted;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
      aria-hidden="true"
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <img
          src={LOGO}
          alt=""
          className="h-16 w-16 rounded-full object-cover animate-[splashIn_0.6s_ease-out]"
        />
        {isBoot && (
          <span className="text-xl font-black tracking-tight">
            Farm<span className="text-brand">X</span>
          </span>
        )}
      </div>
      <div className="h-10" />
    </div>
  );
}
