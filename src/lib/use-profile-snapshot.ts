import { useCallback, useEffect, useState } from "react";
import { getProfileRepository, type ProfileSnapshot } from "@/lib/profile-repository";

type SnapshotState =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: ProfileSnapshot; error: null }
  | { status: "error"; data: null; error: string };

export function useProfileSnapshot() {
  const [state, setState] = useState<SnapshotState>({ status: "loading", data: null, error: null });
  const refresh = useCallback(async () => {
    setState({ status: "loading", data: null, error: null });
    try {
      const repository = await getProfileRepository();
      setState({ status: "ready", data: await repository.getSnapshot(), error: null });
    } catch (error) {
      setState({
        status: "error",
        data: null,
        error: error instanceof Error ? error.message : "Unable to load Profile data.",
      });
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { ...state, refresh };
}
