import { useCallback, useEffect, useState } from "react";
import type { FarmXProfile, ProfileStats } from "@/lib/profile.functions";
import { getProfileRepository, type ProfileDataMode } from "@/lib/profile-repository";

export type ProfileLoadState =
  | { status: "loading"; profile: null; stats: null; error: null; mode: ProfileDataMode | null }
  | {
      status: "ready";
      profile: FarmXProfile | null;
      stats: ProfileStats;
      error: null;
      mode: ProfileDataMode;
    }
  | { status: "error"; profile: null; stats: null; error: string; mode: ProfileDataMode | null };

const loadingState: ProfileLoadState = {
  status: "loading",
  profile: null,
  stats: null,
  error: null,
  mode: null,
};

export function useProfileData() {
  const [state, setState] = useState<ProfileLoadState>(loadingState);

  const refresh = useCallback(async () => {
    setState(loadingState);
    try {
      const repository = await getProfileRepository();
      const data = await repository.getProfile();
      setState({
        status: "ready",
        profile: data.profile,
        stats: data.stats,
        error: null,
        mode: repository.mode,
      });
    } catch (error) {
      setState({
        status: "error",
        profile: null,
        stats: null,
        error: error instanceof Error ? error.message : "Unable to load your profile.",
        mode: null,
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}
