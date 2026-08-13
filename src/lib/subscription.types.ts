export type SubscriptionTier =
  | "FREE"
  | "STARTER"
  | "BASIC"
  | "PREMIUM"
  | "VIP"
  | "BUSINESS"
  | "DIAMOND"
  | "ENTERPRISE";

export type SubscriptionStatus =
  | "FREE"
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELLED"
  | "PENDING"
  | "PAST_DUE";

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price: number;
  currency: string;
  billingPeriod: "monthly";
  description: string;
  maxListings: number;
  topCredits: number;
  badge?: string;
  features: string[];
  restrictions: string[];
}

export interface UserSubscription {
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  startDate: string;
  renewalDate: string;
  remainingDays: number;
  autoRenew: boolean;
  reference?: string;
}
