import { useCallback, useEffect, useState } from "react";
import { getMyAds } from "@/lib/profile.functions";

export type MyAd = Awaited<ReturnType<typeof getMyAds>>[number];

type AdsState =
  | { status: "idle"; ads: MyAd[]; error: null }
  | { status: "loading"; ads: MyAd[]; error: null }
  | { status: "ready"; ads: MyAd[]; error: null }
  | { status: "error"; ads: MyAd[]; error: string };

export function useMyAds(enabled: boolean) {
  const [state, setState] = useState<AdsState>({ status: "idle", ads: [], error: null });

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setState((current) => ({ status: "loading", ads: current.ads, error: null }));
    try {
      const ads = await getMyAds();
      setState({ status: "ready", ads, error: null });
    } catch (error) {
      setState({
        status: "error",
        ads: [],
        error: error instanceof Error ? error.message : "Unable to load your advertisements.",
      });
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) void refresh();
    else setState({ status: "idle", ads: [], error: null });
  }, [enabled, refresh]);

  return { ...state, refresh };
}
