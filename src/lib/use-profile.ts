import { useCallback, useEffect, useState } from "react";
import { getMyProfile, type FarmXProfile, type ProfileStats } from "@/lib/profile.functions";

export type ProfileLoadState =
  | { status: "loading"; profile: null; stats: null; error: null }
  | { status: "ready"; profile: FarmXProfile | null; stats: ProfileStats; error: null }
  | { status: "error"; profile: null; stats: null; error: string };

const loadingState: ProfileLoadState = {
  status: "loading",
  profile: null,
  stats: null,
  error: null,
};

export function useProfileData() {
  const [state, setState] = useState<ProfileLoadState>(loadingState);

  const refresh = useCallback(async () => {
    setState(loadingState);
    try {
      const data = await getMyProfile();
      setState({
        status: "ready",
        profile: data.profile,
        stats: data.stats,
        error: null,
      });
    } catch (error) {
      setState({
        status: "error",
        profile: null,
        stats: null,
        error: error instanceof Error ? error.message : "Unable to load your profile.",
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}
