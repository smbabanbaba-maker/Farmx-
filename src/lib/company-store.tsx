import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { COUNTRIES, DEFAULT_COUNTRY, type Country } from "./currency";

export type BadgeTier = "none" | "bluetek" | "gold" | "platinum";

export const TIER_PRICING_NGN: Record<Exclude<BadgeTier, "none">, number> = {
  bluetek: 4500,
  gold: 9000,
  platinum: 18000,
};

export const TIER_META: Record<
  Exclude<BadgeTier, "none">,
  { label: string; color: string; perks: string[] }
> = {
  bluetek: {
    label: "Bluetek",
    color: "#2563eb",
    perks: ["Verified badge on all products", "Company mini website", "Basic analytics"],
  },
  gold: {
    label: "Gold",
    color: "#eab308",
    perks: [
      "Everything in Bluetek",
      "Priority search ranking",
      "Coupons & promo codes",
      "Custom mini-site theme",
    ],
  },
  platinum: {
    label: "Platinum",
    color: "#9333ea",
    perks: ["Everything in Gold", "Featured on home", "Advanced analytics", "Dedicated support"],
  },
};

export interface PersonalKYC {
  fullName: string;
  productType: string;
  address: string;
  phone: string;
  photo: string; // emoji or url
  country: string; // ISO code
  state: string;
  emergencyContact: string;
  email: string;
}

export interface CompanyProfile {
  slug: string;
  cacNumber: string;
  name: string;
  logo: string; // emoji or url
  bio: string;
  address: string;
  email: string;
  ceo: string;
  phone: string;
  productType: string;
  country: string; // ISO code
  state: string;
  gps: string;
  partners: string[];
  followers: number;
  themeColor: string; // hex, used on mini-site
  createdAt: number;
}

export interface Review {
  id: string;
  author: string;
  rating: number; // 1..5
  comment: string;
  time: string;
}

export interface CompanyState {
  personal: PersonalKYC | null;
  company: CompanyProfile | null;
  tier: BadgeTier;
  subscribedAt: number | null;
  nextRenewal: number | null;
  reviews: Review[];
  views: number;
  orders: number;
}

const EMPTY: CompanyState = {
  personal: null,
  company: null,
  tier: "none",
  subscribedAt: null,
  nextRenewal: null,
  reviews: [
    {
      id: "r1",
      author: "Aisha M.",
      rating: 5,
      comment: "Sabbin kayan, ingantacce da sauri.",
      time: "2d",
    },
    {
      id: "r2",
      author: "David O.",
      rating: 4,
      comment: "Great communication and packaging.",
      time: "1w",
    },
  ],
  views: 1240,
  orders: 87,
};

type Ctx = {
  state: CompanyState;
  country: Country;
  setCountry: (c: Country) => void;
  savePersonal: (p: PersonalKYC) => void;
  saveCompany: (
    c: Omit<CompanyProfile, "slug" | "createdAt" | "followers" | "themeColor"> &
      Partial<Pick<CompanyProfile, "slug" | "themeColor">>,
  ) => CompanyProfile;
  activateTier: (t: Exclude<BadgeTier, "none">, reference: string) => void;
  cancelSubscription: () => void;
  addReview: (r: Omit<Review, "id" | "time">) => void;
  isBadgeActive: () => boolean;
  slugify: (s: string) => string;
};

const CompanyCtx = createContext<Ctx | null>(null);
const STORAGE_KEY = "farmx-company-state-v1";
const COUNTRY_KEY = "farmx-country";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CompanyState>(EMPTY);
  const [country, setCountryState] = useState<Country>(DEFAULT_COUNTRY);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...EMPTY, ...JSON.parse(raw) });
      const cc = localStorage.getItem(COUNTRY_KEY);
      if (cc) {
        const found = COUNTRIES.find((c) => c.code === cc);
        if (found) setCountryState(found);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (next: CompanyState) => {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const setCountry = (c: Country) => {
    setCountryState(c);
    try {
      localStorage.setItem(COUNTRY_KEY, c.code);
    } catch {
      /* ignore */
    }
  };

  const isBadgeActive = () => {
    if (state.tier === "none") return false;
    if (!state.nextRenewal) return false;
    return Date.now() < state.nextRenewal;
  };

  const value: Ctx = useMemo(
    () => ({
      state,
      country,
      setCountry,
      slugify,
      isBadgeActive,
      savePersonal: (p) => persist({ ...state, personal: p }),
      saveCompany: (c) => {
        const slug = c.slug || slugify(c.name);
        const full: CompanyProfile = {
          slug,
          cacNumber: c.cacNumber,
          name: c.name,
          logo: c.logo,
          bio: c.bio,
          address: c.address,
          email: c.email,
          ceo: c.ceo,
          phone: c.phone,
          productType: c.productType,
          country: c.country,
          state: c.state,
          gps: c.gps,
          partners: c.partners,
          followers: state.company?.followers ?? 0,
          themeColor: c.themeColor ?? state.company?.themeColor ?? "#dc2626",
          createdAt: state.company?.createdAt ?? Date.now(),
        };
        persist({ ...state, company: full });
        return full;
      },
      activateTier: (t, _reference) => {
        const now = Date.now();
        persist({
          ...state,
          tier: t,
          subscribedAt: now,
          nextRenewal: now + 30 * 24 * 60 * 60 * 1000,
        });
      },
      cancelSubscription: () =>
        persist({ ...state, tier: "none", subscribedAt: null, nextRenewal: null }),
      addReview: (r) =>
        persist({
          ...state,
          reviews: [{ ...r, id: `r_${Date.now()}`, time: "just now" }, ...state.reviews],
        }),
    }),
    [state, country],
  );

  return <CompanyCtx.Provider value={value}>{children}</CompanyCtx.Provider>;
}

export function useCompany() {
  const ctx = useContext(CompanyCtx);
  if (!ctx) throw new Error("useCompany must be used inside CompanyProvider");
  return ctx;
}
