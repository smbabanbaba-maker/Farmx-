import { getSubscriptionSummary, setSubscriptionAutoRenew } from "./subscription.functions";
import type {
  SubscriptionPlan,
  UserSubscription,
  SubscriptionTier,
  SubscriptionStatus,
} from "./subscription.types";

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: "FREE",
    name: "Free",
    price: 0,
    currency: "₦",
    billingPeriod: "monthly",
    description: "Get started on Goall26 with essential marketplace access.",
    maxListings: 3,
    topCredits: 0,
    features: [
      "Create Goall26 account",
      "Browse Market",
      "Buy products/services",
      "Chat with sellers",
      "Follow sellers",
      "Save listings",
      "Basic profile",
      "Limited free listings",
    ],
    restrictions: ["No premium promotion included", "Limited monthly listings"],
  },
  {
    tier: "STARTER",
    name: "Starter",
    price: 2000,
    currency: "₦",
    billingPeriod: "monthly",
    description: "Perfect for individuals and small sellers getting started.",
    maxListings: 5,
    topCredits: 1,
    badge: "BEST FOR STARTING",
    features: [
      "Everything in Free",
      "Up to 5 active listings",
      "1 TOP promotion credit per month",
      "Basic seller statistics",
      "Basic seller badge",
      "Priority listing visibility over Free users",
    ],
    restrictions: ["No auto-renew promotion", "No advanced analytics"],
  },
  {
    tier: "BASIC",
    name: "Basic",
    price: 5600,
    currency: "₦",
    billingPeriod: "monthly",
    description: "For growing sellers and small businesses.",
    maxListings: 25,
    topCredits: 3,
    features: [
      "Everything in Starter",
      "Up to 25 active listings",
      "3 TOP promotion credits/month",
      "Better marketplace visibility",
      "Basic auto-renew option",
      "Advanced seller statistics",
      "Verified seller application",
    ],
    restrictions: ["Limited promotional tools"],
  },
  {
    tier: "PREMIUM",
    name: "Premium",
    price: 11200,
    currency: "₦",
    billingPeriod: "monthly",
    description: "For serious sellers and growing businesses.",
    maxListings: 50,
    topCredits: 7,
    badge: "POPULAR",
    features: [
      "Everything in Basic",
      "Up to 50 active listings",
      "7 TOP promotion credits/month",
      "Auto-renew promotions",
      "Advanced Analytics & customer insights",
      "Priority customer support",
      "Seller verification",
    ],
    restrictions: [],
  },
  {
    tier: "VIP",
    name: "VIP",
    price: 18900,
    currency: "₦",
    billingPeriod: "monthly",
    description: "For high-volume sellers and professional businesses.",
    maxListings: 100,
    topCredits: 15,
    features: [
      "Everything in Premium",
      "Up to 100 active listings",
      "15 TOP promotion credits/month",
      "Faster promotional rotation",
      "Advanced sales & customer analytics",
      "Business verification",
    ],
    restrictions: [],
  },
  {
    tier: "BUSINESS",
    name: "Business",
    price: 24300,
    currency: "₦",
    billingPeriod: "monthly",
    description: "For established businesses that need more visibility.",
    maxListings: 200,
    topCredits: 20,
    features: [
      "Everything in VIP",
      "Up to 200 active listings",
      "20 TOP promotion credits/month",
      "Business profile with website link",
      "Promotional campaign tools",
      "Priority support",
    ],
    restrictions: [],
  },
  {
    tier: "DIAMOND",
    name: "Diamond",
    price: 36750,
    currency: "₦",
    billingPeriod: "monthly",
    description: "For professional sellers and large businesses.",
    maxListings: 500,
    topCredits: 30,
    features: [
      "Everything in Business",
      "Up to 500 active listings",
      "30 TOP promotion credits/month",
      "Promotion automation",
      "Social media promotion tools",
      "Reputation management",
    ],
    restrictions: [],
  },
  {
    tier: "ENTERPRISE",
    name: "Enterprise",
    price: 63525,
    currency: "₦",
    billingPeriod: "monthly",
    description: "For large businesses, organizations and commercial sellers.",
    maxListings: 1000,
    topCredits: 60,
    features: [
      "Everything in Diamond",
      "Up to 1,000 active listings",
      "60 TOP promotion credits/month",
      "Advanced enterprise analytics",
      "Multiple business contacts",
      "Dedicated business support",
    ],
    restrictions: [],
  },
];

export class SubscriptionRepository {
  async getUserSubscription(_userId: string): Promise<UserSubscription> {
    return getSubscriptionSummary();
  }

  async updateUserSubscription(
    _userId: string,
    _tier: SubscriptionTier,
    _status: SubscriptionStatus,
    _reference?: string,
  ): Promise<UserSubscription> {
    return getSubscriptionSummary();
  }

  async toggleAutoRenew(_userId: string): Promise<boolean> {
    const current = await getSubscriptionSummary();
    const next = !current.autoRenew;
    const updated = await setSubscriptionAutoRenew({ data: { enabled: next } });
    return updated.autoRenew;
  }
}

let instance: SubscriptionRepository | null = null;
export async function getSubscriptionRepository(): Promise<SubscriptionRepository> {
  instance ??= new SubscriptionRepository();
  return instance;
}
