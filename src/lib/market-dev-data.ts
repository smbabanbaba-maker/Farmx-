import { products } from "@/lib/mock-data";
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
  stats: {
    views: number;
    saves: number;
    shares: number;
    inquiries: number;
  };
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

export const ALL_CATEGORIES: MarketCategory[] = UNIVERSAL_CATEGORIES.map((c) => ({
  id: c.id,
  name: c.name,
  icon: c.icon,
  description: `${c.name} listings on FarmX.`,
  subcategories: c.subcategories.map((s) => s.name),
}));

export const AGRICULTURAL_CATEGORIES = ALL_CATEGORIES; // For backward compatibility

function seller(
  name: string,
  location: string,
  index: number,
  type: SellerType = "business",
): MarketSeller {
  const username =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 20) || `seller${index}`;
  return {
    name,
    username,
    type,
    verification:
      index % 5 === 0 ? "verified_business" : index % 3 === 0 ? "verified_seller" : "phone",
    rating: Number((4.1 + (index % 8) * 0.1).toFixed(1)),
    reviews: 8 + index * 3,
    followers: 34 + index * 17,
    activeListings: 2 + (index % 8),
    location,
    phoneVerified: true,
    emailVerified: index % 3 !== 1,
    photo: "👤",
  };
}

const existingListings: MarketListing[] = products.map((product, index) => {
  const created = new Date(Date.UTC(2026, 7, 12 - (index % 28), 8 + (index % 9), 15));
  return {
    id: product.id,
    title: product.name,
    description: `${product.name} supplied by ${product.seller}. Professional listing on FarmX classifieds.`,
    price: product.price,
    unit: "per unit",
    priceType: index % 4 === 0 ? "negotiable" : "fixed",
    category: "Agriculture & Food",
    subcategory: "Farm Produce",
    condition: "fresh",
    quantity: 10 + index * 4,
    availability: "available",
    status: "published",
    state: product.location,
    city: product.location,
    seller: seller(product.seller, product.location, index + 1),
    images: [product.image],
    imagePlaceholder: product.image,
    featured: product.promoted,
    sponsored: index === 0 || index === 14,
    createdAt: created.toISOString(),
    updatedAt: created.toISOString(),
    stats: {
      views: 80 + index * 43,
      saves: 4 + index * 2,
      shares: 2 + index,
      inquiries: 3 + (index % 12),
    },
    tags: ["agriculture", "farm produce"],
  };
});

const universalListings: MarketListing[] = [
  {
    id: "u1",
    title: "Toyota Camry 2018 XLE",
    description:
      "Foreign used Toyota Camry 2018, full option, leather seat, low mileage. Very clean engine and transmission.",
    price: 18500000,
    unit: "per vehicle",
    priceType: "negotiable",
    category: "Vehicles",
    subcategory: "Cars",
    condition: "used",
    quantity: 1,
    availability: "available",
    status: "published",
    state: "Lagos",
    city: "Ikeja",
    seller: seller("Lagos Auto Hub", "Lagos", 101),
    images: ["🚗"],
    imagePlaceholder: "🚗",
    featured: true,
    sponsored: true,
    createdAt: "2026-08-12T10:00:00.000Z",
    updatedAt: "2026-08-12T10:00:00.000Z",
    stats: { views: 1250, saves: 45, shares: 32, inquiries: 18 },
    tags: ["toyota", "camry", "car", "lagos"],
    metadata: {
      make: "Toyota",
      model: "Camry",
      year: 2018,
      transmission: "Automatic",
      fuel: "Petrol",
    },
  },
  {
    id: "u2",
    title: "iPhone 15 Pro Max 256GB",
    description: "Brand new iPhone 15 Pro Max, Natural Titanium, sealed box. Warranty included.",
    price: 1650000,
    unit: "per unit",
    priceType: "fixed",
    category: "Phones & Tablets",
    subcategory: "Smartphones",
    condition: "new",
    quantity: 5,
    availability: "available",
    status: "published",
    state: "Abuja",
    city: "Wuse 2",
    seller: seller("Gadget Store NG", "Abuja", 102),
    images: ["📱"],
    imagePlaceholder: "📱",
    featured: true,
    sponsored: false,
    createdAt: "2026-08-13T08:30:00.000Z",
    updatedAt: "2026-08-13T08:30:00.000Z",
    stats: { views: 890, saves: 120, shares: 15, inquiries: 24 },
    tags: ["iphone", "apple", "phone", "gadget"],
    metadata: { brand: "Apple", storage: "256GB", color: "Natural Titanium" },
  },
  {
    id: "u3",
    title: "3 Bedroom Apartment for Rent",
    description:
      "Modern 3 bedroom flat at Lekki Phase 1. All rooms ensuite, 24/7 security, constant power supply.",
    price: 4500000,
    unit: "per year",
    priceType: "fixed",
    category: "Property",
    subcategory: "Apartments",
    condition: "new",
    quantity: 1,
    availability: "available",
    status: "published",
    state: "Lagos",
    city: "Lekki",
    seller: seller("Premium Real Estate", "Lagos", 103),
    images: ["🏠"],
    imagePlaceholder: "🏠",
    featured: false,
    sponsored: true,
    createdAt: "2026-08-11T14:20:00.000Z",
    updatedAt: "2026-08-11T14:20:00.000Z",
    stats: { views: 2100, saves: 210, shares: 85, inquiries: 42 },
    tags: ["apartment", "rent", "lekki", "lagos"],
    metadata: {
      bedrooms: 3,
      bathrooms: 3,
      furnished: "Semi-furnished",
      "listing-type": "For Rent",
    },
  },
];

export const marketSeedListings: MarketListing[] = [...universalListings, ...existingListings];

export function getMarketListing(id: string) {
  return marketSeedListings.find((l) => l.id === id);
}

export function getMarketCategory(id: string) {
  return ALL_CATEGORIES.find((c) => c.id === id);
}
