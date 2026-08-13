import { products } from "@/lib/mock-data";

export type MarketCategory = {
  id: string;
  name: string;
  icon: string;
  description: string;
  subcategories: string[];
};

export type SellerType = "individual" | "business";
export type VerificationLevel = "none" | "phone" | "verified_seller" | "verified_business";
export type ListingCondition = "new" | "used" | "refurbished" | "fresh" | "other";
export type ListingAvailability = "available" | "limited" | "unavailable";
export type ListingStatus =
  "draft" | "pending" | "published" | "rejected" | "suspended" | "expired" | "closed";
export type ListingPriceType = "fixed" | "negotiable";

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
};

export type MarketReport = {
  id: string;
  listingId: string;
  reason: string;
  description?: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  createdAt: string;
};

export const AGRICULTURAL_CATEGORIES: MarketCategory[] = [
  {
    id: "crops-grains",
    name: "Crops & Grains",
    icon: "🌾",
    description: "Fresh and stored crops from Nigerian farms.",
    subcategories: [
      "Maize",
      "Rice",
      "Wheat",
      "Millet",
      "Sorghum",
      "Beans",
      "Soybeans",
      "Groundnut",
      "Sesame",
      "Cassava",
      "Yam",
      "Potato",
      "Vegetables",
      "Fruits",
      "Other Crops",
    ],
  },
  {
    id: "livestock",
    name: "Livestock",
    icon: "🐄",
    description: "Animals and livestock from trusted sellers.",
    subcategories: [
      "Cattle",
      "Goats",
      "Sheep",
      "Poultry",
      "Rabbits",
      "Fish",
      "Pigs",
      "Other Livestock",
    ],
  },
  {
    id: "seeds-seedlings",
    name: "Seeds & Seedlings",
    icon: "🌱",
    description: "Seeds and planting materials for every season.",
    subcategories: [
      "Maize seeds",
      "Rice seeds",
      "Vegetable seeds",
      "Fruit seedlings",
      "Tree seedlings",
      "Other seeds",
    ],
  },
  {
    id: "fertilizers-agrochemicals",
    name: "Fertilizers & Agrochemicals",
    icon: "🪴",
    description: "Agricultural inputs for healthy crop production.",
    subcategories: [
      "Fertilizers",
      "Organic fertilizers",
      "Herbicides",
      "Pesticides",
      "Fungicides",
      "Other agricultural inputs",
    ],
  },
  {
    id: "machinery-equipment",
    name: "Farm Machinery & Equipment",
    icon: "🚜",
    description: "Machines and equipment for modern farming.",
    subcategories: [
      "Tractors",
      "Harvesters",
      "Planters",
      "Ploughs",
      "Cultivators",
      "Processing machines",
      "Sprayers",
      "Other machinery",
    ],
  },
  {
    id: "irrigation",
    name: "Irrigation",
    icon: "💧",
    description: "Water systems and irrigation accessories.",
    subcategories: [
      "Water pumps",
      "Drip irrigation",
      "Sprinklers",
      "Pipes",
      "Water tanks",
      "Irrigation controllers",
      "Irrigation accessories",
    ],
  },
  {
    id: "solar-farm-energy",
    name: "Solar & Farm Energy",
    icon: "☀️",
    description: "Reliable energy solutions for farms.",
    subcategories: [
      "Solar pumps",
      "Solar panels",
      "Inverters",
      "Batteries",
      "Solar irrigation systems",
      "Farm energy equipment",
    ],
  },
  {
    id: "greenhouse-structures",
    name: "Greenhouse & Farm Structures",
    icon: "🏠",
    description: "Structures for protected farming and storage.",
    subcategories: [
      "Greenhouses",
      "Poultry houses",
      "Animal shelters",
      "Storage facilities",
      "Farm fencing",
      "Other structures",
    ],
  },
  {
    id: "poultry-equipment",
    name: "Poultry Equipment",
    icon: "🐔",
    description: "Equipment for poultry farmers and hatcheries.",
    subcategories: [
      "Feeders",
      "Drinkers",
      "Incubators",
      "Brooders",
      "Cages",
      "Egg equipment",
      "Other poultry equipment",
    ],
  },
  {
    id: "fish-farming",
    name: "Fish Farming",
    icon: "🐟",
    description: "Fish farming stock, feed, tanks, and equipment.",
    subcategories: [
      "Fish tanks",
      "Fish feed",
      "Fingerlings",
      "Pumps",
      "Filters",
      "Aeration equipment",
      "Other fish farming equipment",
    ],
  },
  {
    id: "animal-feed",
    name: "Animal Feed",
    icon: "🌽",
    description: "Quality feed and supplements for livestock.",
    subcategories: [
      "Poultry feed",
      "Cattle feed",
      "Goat/sheep feed",
      "Fish feed",
      "Supplements",
      "Other feeds",
    ],
  },
  {
    id: "farm-tools",
    name: "Farm Tools",
    icon: "🛠️",
    description: "Hand tools and protective equipment for field work.",
    subcategories: [
      "Hoes",
      "Cutlasses",
      "Shovels",
      "Wheelbarrows",
      "Pruning tools",
      "Hand tools",
      "Protective equipment",
    ],
  },
  {
    id: "agricultural-processing",
    name: "Agricultural Processing",
    icon: "⚙️",
    description: "Processing, milling, drying, and packaging equipment.",
    subcategories: [
      "Milling machines",
      "Grinding machines",
      "Dryers",
      "Packaging equipment",
      "Processing equipment",
    ],
  },
  {
    id: "processed-products",
    name: "Processed Agricultural Products",
    icon: "📦",
    description: "Ready-to-use and packaged farm products.",
    subcategories: [
      "Processed grains",
      "Flour",
      "Oil",
      "Dried food",
      "Packaged agricultural products",
      "Other processed products",
    ],
  },
  {
    id: "farm-services",
    name: "Farm Services",
    icon: "🤝",
    description: "Specialist services that help farms grow.",
    subcategories: [
      "Farm installation",
      "Irrigation installation",
      "Tractor services",
      "Farm labor",
      "Soil testing",
      "Agricultural consulting",
      "Veterinary services",
      "Transport/logistics",
      "Equipment rental",
      "Other farm services",
    ],
  },
  {
    id: "land-properties",
    name: "Land & Farm Properties",
    icon: "🌍",
    description: "Farmland, warehouses, and agricultural properties.",
    subcategories: [
      "Farmland",
      "Farms",
      "Agricultural properties",
      "Warehouses",
      "Farm buildings",
      "Other agricultural properties",
    ],
  },
  {
    id: "transport-logistics",
    name: "Transport & Logistics",
    icon: "🚚",
    description: "Farm transport, haulage, and cold-chain services.",
    subcategories: [
      "Farm transport",
      "Truck services",
      "Produce transportation",
      "Cold-chain/logistics",
      "Other logistics",
    ],
  },
  {
    id: "other-agriculture",
    name: "Other Agricultural Products & Services",
    icon: "🌿",
    description: "Additional agricultural products and services.",
    subcategories: ["Other agricultural products", "Other agricultural services"],
  },
];

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

function categoryForProduct(name: string): {
  category: string;
  subcategory: string;
  condition: ListingCondition;
  unit: string;
  tags: string[];
} {
  const value = name.toLowerCase();
  if (/maize|rice|groundnut|millet|sorghum|bean|sesame|cocoa/.test(value))
    return {
      category: "Crops & Grains",
      subcategory: value.includes("rice")
        ? "Rice"
        : value.includes("maize")
          ? "Maize"
          : "Other Crops",
      condition: "fresh",
      unit: value.includes("kg") ? "per bag" : "per basket",
      tags: ["wholesale", "farm produce"],
    };
  if (/tomato|okra|plantain|vegetable|fruit|onion|cabbage|watermelon|avocado|mango/.test(value))
    return {
      category: "Crops & Grains",
      subcategory: "Vegetables",
      condition: "fresh",
      unit: "per basket",
      tags: ["fresh", "farm produce"],
    };
  if (/yam|cassava|potato|ginger/.test(value))
    return {
      category: "Crops & Grains",
      subcategory: value.includes("yam") ? "Yam" : "Other Crops",
      condition: "fresh",
      unit: "per basket",
      tags: ["fresh", "bulk"],
    };
  if (/poultry|chicken|goat|fish/.test(value))
    return {
      category: value.includes("feed") ? "Animal Feed" : "Livestock",
      subcategory: value.includes("feed") ? "Poultry feed" : "Poultry",
      condition: "fresh",
      unit: "per piece",
      tags: ["livestock", "available"],
    };
  if (/fertilizer/.test(value))
    return {
      category: "Fertilizers & Agrochemicals",
      subcategory: "Fertilizers",
      condition: "new",
      unit: "per bag",
      tags: ["farm input", "wholesale"],
    };
  if (/seedling/.test(value))
    return {
      category: "Seeds & Seedlings",
      subcategory: "Tree seedlings",
      condition: "new",
      unit: "per piece",
      tags: ["seedling", "farm input"],
    };
  return {
    category: "Other Agricultural Products & Services",
    subcategory: "Other agricultural products",
    condition: "other",
    unit: "per unit",
    tags: ["agriculture"],
  };
}

const existingListings: MarketListing[] = products.map((product, index) => {
  const details = categoryForProduct(product.name);
  const created = new Date(Date.UTC(2026, 7, 12 - (index % 28), 8 + (index % 9), 15));
  return {
    id: product.id,
    title: product.name,
    description: `${product.name} supplied by ${product.seller}. Ask the seller about quantity, pickup, and current availability.`,
    price: product.price,
    unit: details.unit,
    priceType: index % 4 === 0 ? "negotiable" : "fixed",
    category: details.category,
    subcategory: details.subcategory,
    condition: details.condition,
    quantity: 10 + index * 4,
    availability: index % 11 === 0 ? "limited" : "available",
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
    tags: details.tags,
  };
});

const extraListings: MarketListing[] = [
  {
    id: "31",
    title: "Diesel Water Pump — 6HP",
    description: "Reliable water pump for small and medium irrigation farms.",
    price: 285000,
    unit: "per piece",
    priceType: "negotiable",
    category: "Irrigation",
    subcategory: "Water pumps",
    condition: "used",
    quantity: 4,
    availability: "available",
    status: "published",
    state: "Kano",
    city: "Kano",
    seller: seller("Kano Irrigation Hub", "Kano", 31),
    images: ["💧"],
    imagePlaceholder: "💧",
    featured: true,
    sponsored: false,
    createdAt: "2026-08-12T07:15:00.000Z",
    updatedAt: "2026-08-12T07:15:00.000Z",
    stats: { views: 532, saves: 23, shares: 14, inquiries: 12 },
    tags: ["irrigation", "equipment", "farm input"],
  },
  {
    id: "32",
    title: "Solar Irrigation Pump Kit",
    description: "Complete solar-powered pump kit for farms without reliable grid power.",
    price: 780000,
    unit: "per kit",
    priceType: "fixed",
    category: "Solar & Farm Energy",
    subcategory: "Solar irrigation systems",
    condition: "new",
    quantity: 6,
    availability: "limited",
    status: "published",
    state: "Kaduna",
    city: "Kaduna",
    seller: seller("SunGrow Energy", "Kaduna", 32),
    images: ["☀️"],
    imagePlaceholder: "☀️",
    featured: false,
    sponsored: true,
    createdAt: "2026-08-11T10:20:00.000Z",
    updatedAt: "2026-08-11T10:20:00.000Z",
    stats: { views: 698, saves: 41, shares: 21, inquiries: 19 },
    tags: ["solar", "irrigation", "new"],
  },
  {
    id: "33",
    title: "Borehole Drilling & Farm Irrigation",
    description: "Professional borehole, pump installation, and irrigation setup for farms.",
    price: null,
    priceLabel: "Request quote",
    unit: "per service",
    priceType: "negotiable",
    category: "Farm Services",
    subcategory: "Irrigation installation",
    condition: "other",
    quantity: 1,
    availability: "available",
    status: "published",
    state: "Kano",
    city: "Kano",
    seller: seller("Arew Irrigation Services", "Kano", 33),
    images: ["🤝"],
    imagePlaceholder: "🤝",
    featured: false,
    sponsored: false,
    createdAt: "2026-08-10T09:00:00.000Z",
    updatedAt: "2026-08-10T09:00:00.000Z",
    stats: { views: 256, saves: 12, shares: 8, inquiries: 17 },
    tags: ["service", "irrigation", "quote"],
  },
  {
    id: "34",
    title: "Saanen Goats — Breeding Pair",
    description: "Healthy breeding goats with seller guidance available.",
    price: 185000,
    unit: "per animal",
    priceType: "negotiable",
    category: "Livestock",
    subcategory: "Goats",
    condition: "fresh",
    quantity: 8,
    availability: "limited",
    status: "published",
    state: "Plateau",
    city: "Jos",
    seller: seller("Highland Livestock Farm", "Plateau", 34, "business"),
    images: ["🐐"],
    imagePlaceholder: "🐐",
    featured: false,
    sponsored: false,
    createdAt: "2026-08-09T11:00:00.000Z",
    updatedAt: "2026-08-09T11:00:00.000Z",
    stats: { views: 389, saves: 28, shares: 11, inquiries: 13 },
    tags: ["livestock", "goats", "breeding"],
  },
  {
    id: "35",
    title: "NPK 15-15-15 Fertilizer — 50kg",
    description: "Balanced fertilizer for grains, vegetables, and field crops.",
    price: 42000,
    unit: "per bag",
    priceType: "fixed",
    category: "Fertilizers & Agrochemicals",
    subcategory: "Fertilizers",
    condition: "new",
    quantity: 120,
    availability: "available",
    status: "published",
    state: "Kaduna",
    city: "Zaria",
    seller: seller("Northern Agro Inputs", "Kaduna", 35),
    images: ["🪴"],
    imagePlaceholder: "🪴",
    featured: true,
    sponsored: false,
    createdAt: "2026-08-08T08:40:00.000Z",
    updatedAt: "2026-08-08T08:40:00.000Z",
    stats: { views: 815, saves: 52, shares: 34, inquiries: 27 },
    tags: ["fertilizer", "farm input", "wholesale"],
  },
  {
    id: "36",
    title: "Used Massey Ferguson Tractor",
    description: "Field-ready tractor inspected by the seller. Viewings available by appointment.",
    price: 18500000,
    unit: "per piece",
    priceType: "negotiable",
    category: "Farm Machinery & Equipment",
    subcategory: "Tractors",
    condition: "used",
    quantity: 1,
    availability: "available",
    status: "published",
    state: "FCT Abuja",
    city: "Abuja",
    seller: seller("AgroMach Nigeria", "FCT Abuja", 36, "business"),
    images: ["🚜"],
    imagePlaceholder: "🚜",
    featured: true,
    sponsored: false,
    createdAt: "2026-08-07T14:00:00.000Z",
    updatedAt: "2026-08-07T14:00:00.000Z",
    stats: { views: 1224, saves: 63, shares: 45, inquiries: 31 },
    tags: ["tractor", "machinery", "used"],
  },
  {
    id: "37",
    title: "Catfish Fingerlings — 1,000",
    description: "Healthy catfish fingerlings suitable for pond stocking.",
    price: 65000,
    unit: "per batch",
    priceType: "fixed",
    category: "Fish Farming",
    subcategory: "Fingerlings",
    condition: "fresh",
    quantity: 15,
    availability: "available",
    status: "published",
    state: "Lagos",
    city: "Ikorodu",
    seller: seller("Lagos Aquaculture", "Lagos", 37),
    images: ["🐟"],
    imagePlaceholder: "🐟",
    featured: false,
    sponsored: false,
    createdAt: "2026-08-06T12:00:00.000Z",
    updatedAt: "2026-08-06T12:00:00.000Z",
    stats: { views: 306, saves: 19, shares: 12, inquiries: 10 },
    tags: ["fish", "fingerlings", "aquaculture"],
  },
  {
    id: "38",
    title: "Farmland for Lease — 10 Acres",
    description: "Accessible farmland suitable for grains and vegetable cultivation.",
    price: 850000,
    unit: "per acre",
    priceType: "negotiable",
    category: "Land & Farm Properties",
    subcategory: "Farmland",
    condition: "other",
    quantity: 10,
    availability: "available",
    status: "published",
    state: "Niger",
    city: "Minna",
    seller: seller("Green Belt Properties", "Niger", 38, "business"),
    images: ["🌍"],
    imagePlaceholder: "🌍",
    featured: false,
    sponsored: false,
    createdAt: "2026-08-05T09:00:00.000Z",
    updatedAt: "2026-08-05T09:00:00.000Z",
    stats: { views: 478, saves: 36, shares: 23, inquiries: 15 },
    tags: ["farmland", "property", "lease"],
  },
  {
    id: "39",
    title: "Poultry House Installation",
    description:
      "Design and installation of practical poultry housing for small and commercial farms.",
    price: 350000,
    unit: "per service",
    priceType: "negotiable",
    category: "Farm Services",
    subcategory: "Poultry houses",
    condition: "other",
    quantity: 1,
    availability: "available",
    status: "published",
    state: "Oyo",
    city: "Ibadan",
    seller: seller("BuildRight Agro", "Oyo", 39, "business"),
    images: ["🏠"],
    imagePlaceholder: "🏠",
    featured: false,
    sponsored: false,
    createdAt: "2026-08-04T15:10:00.000Z",
    updatedAt: "2026-08-04T15:10:00.000Z",
    stats: { views: 198, saves: 9, shares: 6, inquiries: 8 },
    tags: ["service", "poultry", "farm structure"],
  },
  {
    id: "40",
    title: "Industrial Grain Milling Machine",
    description: "Commercial milling machine for maize, millet, and other grains.",
    price: 4250000,
    unit: "per piece",
    priceType: "negotiable",
    category: "Agricultural Processing",
    subcategory: "Milling machines",
    condition: "new",
    quantity: 2,
    availability: "limited",
    status: "published",
    state: "Kano",
    city: "Kano",
    seller: seller("NorthMill Engineering", "Kano", 40, "business"),
    images: ["⚙️"],
    imagePlaceholder: "⚙️",
    featured: false,
    sponsored: false,
    createdAt: "2026-08-03T10:30:00.000Z",
    updatedAt: "2026-08-03T10:30:00.000Z",
    stats: { views: 633, saves: 31, shares: 17, inquiries: 14 },
    tags: ["processing", "machinery", "milling"],
  },
  {
    id: "41",
    title: "Cold-Chain Produce Transport",
    description: "Refrigerated transport for vegetables, fruits, fish, and other perishables.",
    price: null,
    priceLabel: "Request quote",
    unit: "per service",
    priceType: "negotiable",
    category: "Transport & Logistics",
    subcategory: "Cold-chain/logistics",
    condition: "other",
    quantity: 1,
    availability: "available",
    status: "published",
    state: "Lagos",
    city: "Lagos",
    seller: seller("FreshRoute Logistics", "Lagos", 41, "business"),
    images: ["🚚"],
    imagePlaceholder: "🚚",
    featured: false,
    sponsored: false,
    createdAt: "2026-08-02T08:00:00.000Z",
    updatedAt: "2026-08-02T08:00:00.000Z",
    stats: { views: 275, saves: 15, shares: 7, inquiries: 11 },
    tags: ["logistics", "transport", "cold chain"],
  },
  {
    id: "42",
    title: "Greenhouse Tomato Setup",
    description: "Complete greenhouse installation and starter guidance for tomato growers.",
    price: 1250000,
    unit: "per service",
    priceType: "negotiable",
    category: "Greenhouse & Farm Structures",
    subcategory: "Greenhouses",
    condition: "new",
    quantity: 3,
    availability: "available",
    status: "published",
    state: "Plateau",
    city: "Jos",
    seller: seller("Jos Greenhouse Works", "Plateau", 42, "business"),
    images: ["🏡"],
    imagePlaceholder: "🏡",
    featured: true,
    sponsored: false,
    createdAt: "2026-08-01T09:15:00.000Z",
    updatedAt: "2026-08-01T09:15:00.000Z",
    stats: { views: 524, saves: 29, shares: 18, inquiries: 16 },
    tags: ["greenhouse", "service", "tomato"],
  },
];

export const marketSeedListings: MarketListing[] = [...existingListings, ...extraListings];

export function getMarketListing(id: string) {
  return marketSeedListings.find((listing) => listing.id === id);
}

export function getMarketCategory(idOrName: string) {
  const value = idOrName.toLowerCase();
  return AGRICULTURAL_CATEGORIES.find(
    (category) => category.id === value || category.name.toLowerCase() === value,
  );
}
