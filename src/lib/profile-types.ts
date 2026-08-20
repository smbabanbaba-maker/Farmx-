import type { MyAd } from "@/lib/use-my-ads";
import type { Goall26Profile, ProfileStats } from "@/lib/profile.functions";

export type Inquiry = {
  id: string;
  buyerName: string;
  buyerInitials: string;
  adId: string;
  adTitle: string;
  date: string;
  lastMessage: string;
  status: "new" | "replied" | "closed";
  phoneAvailable: boolean;
};
export type Interaction = {
  id: string;
  kind: "contacted_ad" | "buyer_contact" | "viewed" | "saved" | "conversation";
  title: string;
  detail: string;
  occurredAt: string;
  targetId?: string;
};
export type Campaign = {
  id: string;
  adTitle: string;
  type: "Boost" | "Featured";
  status: "active" | "completed" | "scheduled";
  budget: number;
  spend: number;
  durationDays: number;
  startedAt: string;
  views: number;
  clicks: number;
  contacts: number;
};
export type WalletTransaction = {
  id: string;
  type:
    | "Wallet top-up"
    | "Boost Ad"
    | "Featured Ad"
    | "Pro Sales"
    | "Premium subscription"
    | "Promotional credit"
    | "Eligible service refund";
  amount: number;
  direction: "credit" | "debit";
  status: "completed" | "pending" | "failed" | "refunded";
  createdAt: string;
  reference: string;
};
export type Review = {
  id: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
  reply?: string;
  verifiedInteraction: boolean;
  direction: "received" | "given";
};
export type Person = {
  id: string;
  name: string;
  username: string;
  role: string;
  location: string;
  following: boolean;
  followsYou: boolean;
};
export type VerificationItem = {
  key: "phone" | "email" | "identity" | "business";
  label: string;
  status: "not_started" | "pending" | "approved" | "rejected" | "more_information";
  updatedAt?: string;
  documentName?: string;
};
export type SupportTicket = {
  id: string;
  subject: string;
  category: string;
  status: "open" | "in_progress" | "waiting_for_user" | "closed";
  createdAt: string;
  lastReply: string;
};
export type ProfileActivity = {
  id: string;
  type:
    | "ad_created"
    | "ad_updated"
    | "ad_published"
    | "ad_boosted"
    | "ad_paused"
    | "ad_closed"
    | "profile_updated"
    | "verification_submitted"
    | "subscription_changed"
    | "service_payment"
    | "follow"
    | "saved_ad";
  title: string;
  detail: string;
  occurredAt: string;
};

export type ProfileDataState = {
  profile: Goall26Profile;
  stats: ProfileStats;
  ads: MyAd[];
  inquiries: Inquiry[];
  interactions: Interaction[];
  campaigns: Campaign[];
  wallet: { balance: number; transactions: WalletTransaction[] };
  subscription: {
    plan: "FREE" | "PRO" | "BUSINESS";
    startedAt: string;
    expiresAt: string;
    autoRenew: boolean;
    history: { plan: string; amount: number; date: string; status: string }[];
  };
  savedAds: {
    id: string;
    title: string;
    price: number;
    seller: string;
    location: string;
    status: string;
    savedAt: string;
  }[];
  people: Person[];
  reviews: Review[];
  verification: VerificationItem[];
  business: {
    name: string;
    category: string;
    description: string;
    location: string;
    phone: string;
    email: string;
    website: string;
    socialLinks: string[];
    registrationInfo: string;
    verificationStatus: string;
  };
  notifications: {
    id: string;
    category: string;
    title: string;
    body: string;
    read: boolean;
    createdAt: string;
  }[];
  safety: {
    blockedUsers: Person[];
    reports: { id: string; subject: string; status: string; createdAt: string }[];
  };
  tickets: SupportTicket[];
  activity: ProfileActivity[];
};
