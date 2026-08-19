import { useCallback, useEffect, useState } from "react";
import { getProfileRepository } from "@/lib/profile-repository";

export type MyAd = {
  listingId: string;
  title: string;
  price: number;
  region: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  imageKeys: string[];
  viewCount: number;
  savedCount: number;
  inquiryCount: number;
  promoExpiresAt: string | null;
};

type AdsState =
  | { status: "idle"; ads: MyAd[]; error: null }
  | { status: "loading"; ads: MyAd[]; error: null }
  | { status: "ready"; ads: MyAd[]; error: null }
  | { status: "error"; ads: MyAd[]; error: string };

export function useMyAds(enabled: boolean) {
  const [state, setState] = useState<AdsState>({
    status: "idle",
    ads: [],
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setState((current) => ({
      status: "loading",
      ads: current.ads,
      error: null,
    }));
    try {
      const repository = await getProfileRepository();
      const ads = await repository.getAds();
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
