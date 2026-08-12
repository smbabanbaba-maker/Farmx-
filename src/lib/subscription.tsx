import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type TierId =
  | "free"
  | "basic"
  | "premium"
  | "vip"
  | "vip_gold"
  | "diamond_gold"
  | "diamond_elite"
  | "enterprise_gold"
  | "enterprise_elite"
  | "enterprise_lux";

export interface Tier {
  id: TierId;
  name: string;
  monthly: number;
  firstInstallment: number;
  secondInstallment: number;
  listings: number;
  accent: string;
}

export const FREE_QUOTA = 5;

function tier(id: TierId, name: string, monthly: number, listings: number, accent: string): Tier {
  const firstInstallment = Math.floor(monthly / 2);
  return {
    id,
    name,
    monthly,
    firstInstallment,
    secondInstallment: monthly - firstInstallment,
    listings,
    accent,
  };
}

export const TIERS: Tier[] = [
  tier("basic", "Basic", 5600, 20, "bg-slate-500"),
  tier("premium", "Premium", 11200, 50, "bg-sky-600"),
  tier("vip", "VIP", 18900, 100, "bg-indigo-600"),
  tier("vip_gold", "VIP Gold", 24325, 150, "bg-amber-500"),
  tier("diamond_gold", "Diamond Gold", 36750, 250, "bg-yellow-600"),
  tier("diamond_elite", "Diamond Elite", 45850, 400, "bg-cyan-600"),
  tier("enterprise_gold", "Enterprise Gold", 63525, 750, "bg-orange-600"),
  tier("enterprise_elite", "Enterprise Elite", 135450, 1500, "bg-fuchsia-700"),
  tier("enterprise_lux", "Enterprise Lux", 203350, 3000, "bg-brand"),
];

export const getTier = (id: TierId) => TIERS.find((item) => item.id === id);

interface SubState {
  tier: TierId;
  freeUsed: number;
  paidUsed: number;
  installmentsPaid: 0 | 1 | 2;
  startedAt?: number;
  secondDueAt?: number;
  payments: { at: number; amount: number; reference: string; part: 1 | 2 }[];
}

const KEY = "farmx-subscription-v1";
const initial: SubState = {
  tier: "free",
  freeUsed: 0,
  paidUsed: 0,
  installmentsPaid: 0,
  payments: [],
};
export const INSTALLMENT_GAP_DAYS = 15;

type Ctx = {
  state: SubState;
  tier?: Tier;
  freeLeft: number;
  canPost: boolean;
  listingsLeft: number;
  quotaUnlocked: number;
  secondDueAt?: number;
  secondInstallmentDue: boolean;
  consumeListing: () => void;
  activateTier: (id: TierId, reference?: string) => void;
  paySecondInstallment: (reference?: string) => void;
  reset: () => void;
};

const SubCtx = createContext<Ctx | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SubState>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...initial, ...JSON.parse(raw) });
    } catch {
      /* storage can be unavailable */
    }
  }, []);

  const persist = useCallback((next: SubState) => {
    setState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage can be unavailable */
    }
  }, []);

  const value = useMemo<Ctx>(() => {
    const activeTier = state.tier === "free" ? undefined : getTier(state.tier);
    const freeLeft = Math.max(0, FREE_QUOTA - state.freeUsed);
    const quotaUnlocked = activeTier
      ? state.installmentsPaid >= 2
        ? activeTier.listings
        : Math.ceil(activeTier.listings / 2)
      : freeLeft;
    const listingsLeft = activeTier ? Math.max(0, quotaUnlocked - state.paidUsed) : freeLeft;

    return {
      state,
      tier: activeTier,
      freeLeft,
      canPost: listingsLeft > 0,
      listingsLeft,
      quotaUnlocked,
      secondDueAt: state.secondDueAt,
      secondInstallmentDue: !!activeTier && state.installmentsPaid === 1,
      consumeListing: () =>
        persist(
          activeTier
            ? { ...state, paidUsed: state.paidUsed + 1 }
            : { ...state, freeUsed: state.freeUsed + 1 },
        ),
      activateTier: (id, reference = `pay_${Date.now()}`) => {
        const selected = getTier(id);
        if (!selected) return;
        const now = Date.now();
        persist({
          ...state,
          tier: id,
          paidUsed: 0,
          installmentsPaid: 1,
          startedAt: now,
          secondDueAt: now + INSTALLMENT_GAP_DAYS * 24 * 3600 * 1000,
          payments: [
            ...state.payments,
            { at: now, amount: selected.firstInstallment, reference, part: 1 },
          ],
        });
      },
      paySecondInstallment: (reference = `pay_${Date.now()}`) => {
        if (!activeTier) return;
        persist({
          ...state,
          installmentsPaid: 2,
          payments: [
            ...state.payments,
            { at: Date.now(), amount: activeTier.secondInstallment, reference, part: 2 },
          ],
        });
      },
      reset: () => persist(initial),
    };
  }, [state, persist]);

  return <SubCtx.Provider value={value}>{children}</SubCtx.Provider>;
}

export function useSubscription() {
  const ctx = useContext(SubCtx);
  if (!ctx) throw new Error("useSubscription must be used inside SubscriptionProvider");
  return ctx;
}
