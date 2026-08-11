import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

const LOGO = "/farmx-logo.png";

/**
 * FarmX opening splash:
 *  - First app open: full screen FarmX mark (~1.2s)
 *  - Route changes use a restrained logo flash (~0.45s)
 */
export function BrandSplash() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [phase, setPhase] = useState<"boot" | "flash" | "idle">("boot");
  const lastPath = useRef(pathname);
  const booted = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      booted.current = true;
      setPhase("idle");
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;
    if (!booted.current) return;
    setPhase("flash");
    const t = setTimeout(() => setPhase("idle"), 450);
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
      <div className="pb-10 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Marketplace for growth
        </p>
      </div>
    </div>
  );
}
