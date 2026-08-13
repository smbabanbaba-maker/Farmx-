import { useCallback, useEffect, useState } from "react";
import { getProfileRepository, type ProfileDataMode } from "@/lib/profile-repository";

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
  | { status: "idle"; ads: MyAd[]; error: null; mode: ProfileDataMode | null }
  | { status: "loading"; ads: MyAd[]; error: null; mode: ProfileDataMode | null }
  | { status: "ready"; ads: MyAd[]; error: null; mode: ProfileDataMode }
  | { status: "error"; ads: MyAd[]; error: string; mode: ProfileDataMode | null };

export function useMyAds(enabled: boolean) {
  const [state, setState] = useState<AdsState>({
    status: "idle",
    ads: [],
    error: null,
    mode: null,
  });

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setState((current) => ({
      status: "loading",
      ads: current.ads,
      error: null,
      mode: current.mode,
    }));
    try {
      const repository = await getProfileRepository();
      const ads = await repository.getAds();
      setState({ status: "ready", ads, error: null, mode: repository.mode });
    } catch (error) {
      setState({
        status: "error",
        ads: [],
        error: error instanceof Error ? error.message : "Unable to load your advertisements.",
        mode: null,
      });
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) void refresh();
    else setState({ status: "idle", ads: [], error: null, mode: null });
  }, [enabled, refresh]);

  return { ...state, refresh };
}
