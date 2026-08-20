import { useCallback, useEffect, useState } from "react";
import type { Goall26Profile, ProfileStats } from "@/lib/profile.functions";
import { getProfileRepository } from "@/lib/profile-repository";

export type ProfileLoadState =
  | { status: "loading"; profile: null; stats: null; error: null }
  | { status: "ready"; profile: Goall26Profile | null; stats: ProfileStats; error: null }
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
      const repository = await getProfileRepository();
      const data = await repository.getProfile();
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
