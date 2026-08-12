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
  monthly: number; // total naira per month
  installment: number; // naira per installment (x2)
  listings: number; // -1 = unlimited
  accent: string;
}

export const FREE_QUOTA = 5;

export const TIERS: Tier[] = [
  {
    id: "basic",
    name: "Basic",
    monthly: 11199,
    installment: 5600,
    listings: 15,
    accent: "bg-slate-500",
  },
  {
    id: "premium",
    name: "Premium",
    monthly: 22399,
    installment: 11200,
    listings: 40,
    accent: "bg-sky-600",
  },
  {
    id: "vip",
    name: "VIP",
    monthly: 37799,
    installment: 18900,
    listings: 80,
    accent: "bg-indigo-600",
  },
  {
    id: "vip_gold",
    name: "VIP Gold",
    monthly: 48649,
    installment: 24325,
    listings: 120,
    accent: "bg-amber-500",
  },
  {
    id: "diamond_gold",
    name: "Diamond Gold",
    monthly: 73499,
    installment: 36750,
    listings: 200,
    accent: "bg-yellow-600",
  },
  {
    id: "diamond_elite",
    name: "Diamond Elite",
    monthly: 91699,
    installment: 45850,
    listings: 300,
    accent: "bg-cyan-600",
  },
  {
    id: "enterprise_gold",
    name: "Enterprise Gold",
    monthly: 127049,
    installment: 63525,
    listings: 500,
    accent: "bg-orange-600",
  },
  {
    id: "enterprise_elite",
    name: "Enterprise Elite",
    monthly: 270899,
    installment: 135450,
    listings: 1000,
    accent: "bg-fuchsia-700",
  },
  {
    id: "enterprise_lux",
    name: "Enterprise Lux",
    monthly: 406699,
    installment: 203350,
    listings: -1,
    accent: "bg-brand",
  },
];

export const getTier = (id: TierId) => TIERS.find((t) => t.id === id);

interface SubState {
  tier: TierId;
  freeUsed: number; // free ads used
  paidUsed: number; // ads used on current plan
  installmentsPaid: 0 | 1 | 2;
  startedAt?: number;
  secondDueAt?: number; // when the 2nd installment is due
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
  listingsLeft: number | "unlimited";
  quotaUnlocked: number | "unlimited";
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
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: SubState) => {
    setState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<Ctx>(() => {
    const tier = state.tier === "free" ? undefined : getTier(state.tier);
    const freeLeft = Math.max(0, FREE_QUOTA - state.freeUsed);
    // Each installment unlocks half of the plan quota.
    const quotaUnlocked: number | "unlimited" = tier
      ? tier.listings === -1
        ? "unlimited"
        : state.installmentsPaid >= 2
          ? tier.listings
          : Math.ceil(tier.listings / 2)
      : freeLeft;
    const listingsLeft: number | "unlimited" = tier
      ? quotaUnlocked === "unlimited"
        ? "unlimited"
        : Math.max(0, (quotaUnlocked as number) - state.paidUsed)
      : freeLeft;
    const canPost = listingsLeft === "unlimited" || listingsLeft > 0;
    const secondInstallmentDue = !!tier && state.installmentsPaid === 1;

    return {
      state,
      tier,
      freeLeft,
      canPost,
      listingsLeft,
      quotaUnlocked,
      secondDueAt: state.secondDueAt,
      secondInstallmentDue,
      consumeListing: () =>
        persist(
          tier
            ? { ...state, paidUsed: state.paidUsed + 1 }
            : { ...state, freeUsed: state.freeUsed + 1 },
        ),
      activateTier: (id, reference = `ref_${Date.now()}`) => {
        const t = getTier(id);
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
            { at: now, amount: t?.installment ?? 0, reference, part: 1 },
          ],
        });
      },
      paySecondInstallment: (reference = `ref_${Date.now()}`) =>
        persist({
          ...state,
          installmentsPaid: 2,
          payments: [
            ...state.payments,
            { at: Date.now(), amount: tier?.installment ?? 0, reference, part: 2 },
          ],
        }),
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
