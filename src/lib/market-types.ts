import { UNIVERSAL_CATEGORIES } from "./market-categories";

export type MarketCategory = {
  id: string;
  name: string;
  icon: string;
  description: string;
  subcategories: string[];
};

export type SellerType = "individual" | "business";
export type VerificationLevel = "none" | "phone" | "verified_seller" | "verified_business";
export type ListingCondition = "new" | "used" | "refurbished" | "fresh" | "for_parts" | "other";
export type ListingAvailability =
  | "available"
  | "limited"
  | "unavailable"
  | "in_stock"
  | "out_of_stock"
  | "pre_order"
  | "busy"
  | "appointment";
export type ListingStatus =
  "draft" | "pending" | "published" | "rejected" | "suspended" | "expired" | "closed";
export type ListingPriceType = "fixed" | "negotiable" | "request" | "free";

export type MarketSeller = {
  name: string;
  username: string;
  type: SellerType;
  verification: VerificationLevel;
  rating: number;
  reviews: number;
  followers: number;
  activeListings: number;
  location: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  photo: string;
};

export type MarketListing = {
  id: string;
  title: string;
  description: string;
  price: number | null;
  priceLabel?: string;
  unit: string;
  priceType: ListingPriceType;
  category: string;
  subcategory: string;
  condition: ListingCondition;
  quantity: number;
  availability: ListingAvailability;
  status: ListingStatus;
  state: string;
  city: string;
  lga?: string;
  seller: MarketSeller;
  images: string[];
  imagePlaceholder: string;
  featured: boolean;
  sponsored: boolean;
  createdAt: string;
  updatedAt: string;
  stats: { views: number; saves: number; shares: number; inquiries: number };
  tags: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
};

export type MarketReport = {
  id: string;
  listingId: string;
  reason: string;
  description?: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  createdAt: string;
};

export const ALL_CATEGORIES: MarketCategory[] = UNIVERSAL_CATEGORIES.map((category) => ({
  id: category.id,
  name: category.name,
  icon: category.icon,
  description: `${category.name} listings on FarmX.`,
  subcategories: category.subcategories.map((subcategory) => subcategory.name),
}));

export const AGRICULTURAL_CATEGORIES = ALL_CATEGORIES;
export function getMarketCategory(id: string) {
  return ALL_CATEGORIES.find((category) => category.id === id);
}
