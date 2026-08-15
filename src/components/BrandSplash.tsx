import { useRouterState } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";

const LOGO = "/farmx-logo.png";

/**
 * FarmX brand splash:
 *  - First app open: full screen, centered FarmX logo (~1.8s)
 *  - Every route change afterwards: quick logo flash (~0.7s)
 */
export function BrandSplash() {
  // Use try-catch or safe access for router state to prevent boot-time crashes
  let pathname = "/";
  try {
    const state = useRouterState({ select: (s) => s.location.pathname });
    pathname = state;
  } catch (e) {
    console.warn("Router state not ready in BrandSplash");
  }

  const [phase, setPhase] = useState<"boot" | "flash" | "idle">("boot");
  const lastPath = useRef(pathname);
  const booted = useRef(false);

  useEffect(() => {
    // Primary boot timeout
    const t = setTimeout(() => {
      booted.current = true;
      setPhase("idle");
    }, 1800);

    // Fail-safe: force idle after 4s even if something hangs
    const failSafe = setTimeout(() => {
      setPhase("idle");
    }, 4000);

    return () => {
      clearTimeout(t);
      clearTimeout(failSafe);
    };
  }, []);

  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;
    if (!booted.current) return;
    setPhase("flash");
    const t = setTimeout(() => setPhase("idle"), 700);
    return () => clearTimeout(t);
  }, [pathname]);

  if (phase === "idle") return null;

  const isBoot = phase === "boot";

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
