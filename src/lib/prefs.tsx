import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface PrefState {
  saved: string[]; // saved / favourite ad ids
  followed: string[]; // followed seller names
  hiddenAds: string[]; // hidden ad ids
  hiddenSellers: string[]; // hidden seller names
  spamThreads: string[]; // conversation ids marked spam
  closedAds: string[]; // ad ids closed by seller
  toggles: Record<string, boolean>; // settings switches
}

const KEY = "farmx-prefs-v1";
const initial: PrefState = {
  saved: [],
  followed: [],
  hiddenAds: [],
  hiddenSellers: [],
  spamThreads: [],
  closedAds: ["8"],
  toggles: {
    autoAdSharing: true,
    disableChats: false,
    disableFeedback: false,
    inAppCalls: true,
    notifications: true,
  },
};

type Ctx = PrefState & {
  toggleSaved: (id: string) => void;
  isSaved: (id: string) => boolean;
  toggleFollow: (seller: string) => void;
  isFollowing: (seller: string) => boolean;
  hideAd: (id: string) => void;
  hideSeller: (seller: string) => void;
  markSpam: (threadId: string) => void;
  unmarkSpam: (threadId: string) => void;
  setToggle: (key: string, val: boolean) => void;
};

const PrefCtx = createContext<Ctx | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PrefState>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...initial, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: PrefState) => {
    setState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<Ctx>(() => {
    const toggleIn = (list: string[], v: string) =>
      list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
    return {
      ...state,
      toggleSaved: (id) => persist({ ...state, saved: toggleIn(state.saved, id) }),
      isSaved: (id) => state.saved.includes(id),
      toggleFollow: (s) => persist({ ...state, followed: toggleIn(state.followed, s) }),
      isFollowing: (s) => state.followed.includes(s),
      hideAd: (id) => persist({ ...state, hiddenAds: [...new Set([...state.hiddenAds, id])] }),
      hideSeller: (s) =>
        persist({ ...state, hiddenSellers: [...new Set([...state.hiddenSellers, s])] }),
      markSpam: (t) => persist({ ...state, spamThreads: [...new Set([...state.spamThreads, t])] }),
      unmarkSpam: (t) =>
        persist({ ...state, spamThreads: state.spamThreads.filter((x) => x !== t) }),
      setToggle: (key, val) => persist({ ...state, toggles: { ...state.toggles, [key]: val } }),
    };
  }, [state, persist]);

  return <PrefCtx.Provider value={value}>{children}</PrefCtx.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefCtx);
  if (!ctx) throw new Error("usePrefs must be used inside PrefsProvider");
  return ctx;
}
