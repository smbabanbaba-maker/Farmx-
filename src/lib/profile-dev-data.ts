import type { FarmXProfile, ProfileStats } from "@/lib/profile.functions";
import type { MyAd } from "@/lib/use-my-ads";

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

export type DevProfileState = {
  profile: FarmXProfile;
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

export const profilePreviewSeed: DevProfileState = {
  profile: {
    userId: "2d23f7a7-f0dd-4258-94c3-41f8b4a07d33",
    fullName: "Ibrahim Bello",
    username: "ibrahimbello",
    role: "farmer",
    bio: "Maize and rice farmer focused on reliable harvest quality and direct agricultural trade.",
    state: "Kano",
    location: "Kano, Nigeria",
    phone: "+234 812 345 6789",
    email: "ibrahim@farmx.ng",
    agriculturalInterests: ["Maize", "Rice", "Farm inputs"],
    skills: ["Crop production", "Bulk supply", "Farm planning"],
    privacy: {
      profileVisibility: "public",
      messagePermission: "farmx_members",
      callPermission: "farmx_members",
      showFollowers: true,
      showActivity: true,
      showBusinessInfo: true,
    },
    createdAt: "2026-02-12T10:00:00.000Z",
    updatedAt: "2026-08-09T10:00:00.000Z",
    verification: "approved",
  },
  stats: {
    activeAds: 3,
    totalAds: 7,
    totalAdViews: 1842,
    buyerInquiries: 28,
    savedAds: 6,
    followers: 348,
    following: 76,
    rating: 4.8,
    reviews: 19,
  },
  ads: [
    {
      listingId: "71a4f2de-b1a1-4f2e-9366-e07ddfc3e2d1",
      title: "Premium Yellow Maize — 100kg bags",
      price: 68000,
      region: "Kano",
      status: "ACTIVE",
      createdAt: "2026-08-05T10:00:00.000Z",
      updatedAt: "2026-08-05T10:00:00.000Z",
      imageKeys: ["preview/maize-1", "preview/maize-2"],
      viewCount: 764,
      savedCount: 18,
      inquiryCount: 11,
      promoExpiresAt: "2026-08-19T10:00:00.000Z",
    },
    {
      listingId: "5b1237ab-4aaf-4919-b5c6-fc4f0d7c112e",
      title: "Local Rice — 50kg clean bags",
      price: 72500,
      region: "Kaduna",
      status: "ACTIVE",
      createdAt: "2026-07-28T10:00:00.000Z",
      updatedAt: "2026-08-03T10:00:00.000Z",
      imageKeys: ["preview/rice-1"],
      viewCount: 588,
      savedCount: 9,
      inquiryCount: 8,
      promoExpiresAt: null,
    },
    {
      listingId: "3a2d3d7c-49f7-44dd-94a7-2f4fd314be44",
      title: "Organic Soybean — bulk supply",
      price: 91000,
      region: "Katsina",
      status: "PAUSED",
      createdAt: "2026-07-17T10:00:00.000Z",
      updatedAt: "2026-08-06T10:00:00.000Z",
      imageKeys: ["preview/soy-1"],
      viewCount: 313,
      savedCount: 4,
      inquiryCount: 5,
      promoExpiresAt: null,
    },
    {
      listingId: "f8e4cf9a-1e10-4f51-8cee-6b0f20988dbe",
      title: "Improved maize seed — 25kg",
      price: 42500,
      region: "Kano",
      status: "DRAFT",
      createdAt: "2026-08-10T10:00:00.000Z",
      updatedAt: "2026-08-10T10:00:00.000Z",
      imageKeys: [],
      viewCount: 0,
      savedCount: 0,
      inquiryCount: 0,
      promoExpiresAt: null,
    },
    {
      listingId: "dfae73b3-186c-4b6e-8a2e-b55c44408e5a",
      title: "Hybrid tomato seed",
      price: 28500,
      region: "Jigawa",
      status: "EXPIRED",
      createdAt: "2026-05-10T10:00:00.000Z",
      updatedAt: "2026-07-10T10:00:00.000Z",
      imageKeys: ["preview/tomato-1"],
      viewCount: 177,
      savedCount: 2,
      inquiryCount: 2,
      promoExpiresAt: null,
    },
    {
      listingId: "1b2778fc-21fd-4f99-9c57-8798709db1c7",
      title: "Fresh ginger — 200kg",
      price: 156000,
      region: "Kaduna",
      status: "SOLD",
      createdAt: "2026-06-11T10:00:00.000Z",
      updatedAt: "2026-07-03T10:00:00.000Z",
      imageKeys: ["preview/ginger-1"],
      viewCount: 0,
      savedCount: 0,
      inquiryCount: 0,
      promoExpiresAt: null,
    },
    {
      listingId: "ab5b66d0-116d-492c-8a0e-7fe1a158a6a5",
      title: "Quality fertilizer NPK",
      price: 34000,
      region: "Kano",
      status: "REJECTED",
      createdAt: "2026-08-07T10:00:00.000Z",
      updatedAt: "2026-08-07T10:00:00.000Z",
      imageKeys: ["preview/fertilizer-1"],
      viewCount: 0,
      savedCount: 0,
      inquiryCount: 0,
      promoExpiresAt: null,
    },
  ],
  inquiries: [
    {
      id: "inq_001",
      buyerName: "Amina Yusuf",
      buyerInitials: "AY",
      adId: "71a4f2de-b1a1-4f2e-9366-e07ddfc3e2d1",
      adTitle: "Premium Yellow Maize — 100kg bags",
      date: "2026-08-12T09:12:00.000Z",
      lastMessage: "Is 40 bags still available for Kano pickup?",
      status: "new",
      phoneAvailable: true,
    },
    {
      id: "inq_002",
      buyerName: "GreenFields Ltd",
      buyerInitials: "GL",
      adId: "5b1237ab-4aaf-4919-b5c6-fc4f0d7c112e",
      adTitle: "Local Rice — 50kg clean bags",
      date: "2026-08-11T14:25:00.000Z",
      lastMessage: "Please share your best price for 200 bags.",
      status: "replied",
      phoneAvailable: true,
    },
    {
      id: "inq_003",
      buyerName: "Kabiru Farms",
      buyerInitials: "KF",
      adId: "3a2d3d7c-49f7-44dd-94a7-2f4fd314be44",
      adTitle: "Organic Soybean — bulk supply",
      date: "2026-08-10T11:50:00.000Z",
      lastMessage: "Can you deliver to Funtua?",
      status: "closed",
      phoneAvailable: false,
    },
  ],
  interactions: [
    {
      id: "int_001",
      kind: "conversation",
      title: "GreenFields Ltd",
      detail: "You discussed bulk rice availability",
      occurredAt: "2026-08-12T08:10:00.000Z",
      targetId: "c_green",
    },
    {
      id: "int_002",
      kind: "contacted_ad",
      title: "Irrigation pump — 5HP",
      detail: "You contacted Musa Agro Supplies",
      occurredAt: "2026-08-11T13:30:00.000Z",
    },
    {
      id: "int_003",
      kind: "saved",
      title: "Hybrid vegetable seeds",
      detail: "Saved for later",
      occurredAt: "2026-08-10T17:45:00.000Z",
    },
  ],
  campaigns: [
    {
      id: "camp_001",
      adTitle: "Premium Yellow Maize — 100kg bags",
      type: "Boost",
      status: "active",
      budget: 2799,
      spend: 1399,
      durationDays: 7,
      startedAt: "2026-08-10T10:00:00.000Z",
      views: 492,
      clicks: 81,
      contacts: 7,
    },
    {
      id: "camp_002",
      adTitle: "Local Rice — 50kg clean bags",
      type: "Featured",
      status: "completed",
      budget: 5200,
      spend: 5200,
      durationDays: 14,
      startedAt: "2026-07-21T10:00:00.000Z",
      views: 794,
      clicks: 116,
      contacts: 9,
    },
  ],
  wallet: {
    balance: 14650,
    transactions: [
      {
        id: "txn_001",
        type: "Wallet top-up",
        amount: 20000,
        direction: "credit",
        status: "completed",
        createdAt: "2026-08-08T09:00:00.000Z",
        reference: "FXTOPUP-0826",
      },
      {
        id: "txn_002",
        type: "Boost Ad",
        amount: 2799,
        direction: "debit",
        status: "completed",
        createdAt: "2026-08-10T10:00:00.000Z",
        reference: "FXBOOST-0941",
      },
      {
        id: "txn_003",
        type: "Premium subscription",
        amount: 5600,
        direction: "debit",
        status: "completed",
        createdAt: "2026-08-01T11:00:00.000Z",
        reference: "FXPLAN-2110",
      },
    ],
  },
  subscription: {
    plan: "PRO",
    startedAt: "2026-08-01T11:00:00.000Z",
    expiresAt: "2026-09-01T11:00:00.000Z",
    autoRenew: true,
    history: [{ plan: "Pro", amount: 5600, date: "2026-08-01T11:00:00.000Z", status: "Paid" }],
  },
  savedAds: [
    {
      id: "saved_001",
      title: "Hybrid vegetable seeds",
      price: 19000,
      seller: "Kano Seed Hub",
      location: "Kano",
      status: "ACTIVE",
      savedAt: "2026-08-10T17:45:00.000Z",
    },
    {
      id: "saved_002",
      title: "Irrigation pump — 5HP",
      price: 245000,
      seller: "Musa Agro Supplies",
      location: "Kaduna",
      status: "ACTIVE",
      savedAt: "2026-08-08T12:15:00.000Z",
    },
  ],
  people: [
    {
      id: "p_001",
      name: "Amina Yusuf",
      username: "amina_yusuf",
      role: "Buyer",
      location: "Kano",
      following: true,
      followsYou: true,
    },
    {
      id: "p_002",
      name: "GreenFields Ltd",
      username: "greenfields",
      role: "Agricultural business",
      location: "Kaduna",
      following: false,
      followsYou: true,
    },
    {
      id: "p_003",
      name: "Musa Agro Supplies",
      username: "musa_agro",
      role: "Seller",
      location: "Kaduna",
      following: true,
      followsYou: false,
    },
  ],
  reviews: [
    {
      id: "rev_001",
      author: "Amina Yusuf",
      rating: 5,
      comment: "Clear communication and good product information.",
      createdAt: "2026-08-09T11:00:00.000Z",
      verifiedInteraction: true,
      direction: "received",
    },
    {
      id: "rev_002",
      author: "GreenFields Ltd",
      rating: 4,
      comment: "Prompt response on bulk availability.",
      createdAt: "2026-08-04T11:00:00.000Z",
      reply: "Thank you for the feedback.",
      verifiedInteraction: true,
      direction: "received",
    },
    {
      id: "rev_003",
      author: "Musa Agro Supplies",
      rating: 5,
      comment: "Reliable and professional discussion.",
      createdAt: "2026-08-02T11:00:00.000Z",
      verifiedInteraction: true,
      direction: "given",
    },
  ],
  verification: [
    {
      key: "phone",
      label: "Phone verification",
      status: "approved",
      updatedAt: "2026-08-02T10:00:00.000Z",
    },
    {
      key: "email",
      label: "Email verification",
      status: "approved",
      updatedAt: "2026-08-02T10:00:00.000Z",
    },
    {
      key: "identity",
      label: "Identity verification",
      status: "pending",
      updatedAt: "2026-08-11T10:00:00.000Z",
      documentName: "national-id-preview.pdf",
    },
    { key: "business", label: "Business verification", status: "not_started" },
  ],
  business: {
    name: "Ibrahim Bello Farms",
    category: "Grain supplier",
    description: "Direct farm produce and bulk supply for verified agricultural buyers.",
    location: "Kano, Nigeria",
    phone: "+234 812 345 6789",
    email: "sales@ibrahimbellofarms.ng",
    website: "https://ibrahimbellofarms.ng",
    socialLinks: ["https://facebook.com/ibrahimbellofarms"],
    registrationInfo: "CAC registration: pending submission",
    verificationStatus: "Not started",
  },
  notifications: [
    {
      id: "not_001",
      category: "Marketplace",
      title: "New inquiry",
      body: "Amina Yusuf contacted you about Premium Yellow Maize.",
      read: false,
      createdAt: "2026-08-12T09:12:00.000Z",
    },
    {
      id: "not_002",
      category: "Payments",
      title: "Boost campaign active",
      body: "Your maize ad boost is now active.",
      read: true,
      createdAt: "2026-08-10T10:02:00.000Z",
    },
  ],
  safety: {
    blockedUsers: [],
    reports: [
      {
        id: "rep_001",
        subject: "Listing report follow-up",
        status: "Under review",
        createdAt: "2026-08-03T10:00:00.000Z",
      },
    ],
  },
  tickets: [
    {
      id: "TKT-1024",
      subject: "How do I renew a promotion?",
      category: "Promotions",
      status: "in_progress",
      createdAt: "2026-08-07T10:00:00.000Z",
      lastReply: "Our support team is reviewing your request.",
    },
  ],
  activity: [
    {
      id: "act_001",
      type: "ad_boosted",
      title: "Ad boosted",
      detail: "Premium Yellow Maize boost started for 7 days.",
      occurredAt: "2026-08-10T10:00:00.000Z",
    },
    {
      id: "act_002",
      type: "profile_updated",
      title: "Profile updated",
      detail: "Professional information was updated.",
      occurredAt: "2026-08-09T10:00:00.000Z",
    },
    {
      id: "act_003",
      type: "ad_paused",
      title: "Ad paused",
      detail: "Organic Soybean listing was paused.",
      occurredAt: "2026-08-06T10:00:00.000Z",
    },
  ],
};
