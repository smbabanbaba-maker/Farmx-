export const LOCATIONS = [
  "Kano",
  "Zaria",
  "Kaduna",
  "Lagos",
  "Abuja",
  "Asaba",
  "Ogun",
  "Benue",
] as const;
export type LocationName = (typeof LOCATIONS)[number];

export const products = [
  {
    id: "1",
    name: "Maize (100kg)",
    price: 45000,
    seller: "GreenFields Ltd",
    rating: 4.6,
    image: "🌽",
    location: "Kano",
    promoted: true,
  },
  {
    id: "2",
    name: "Fresh Tomatoes",
    price: 12000,
    seller: "Kano Farms",
    rating: 4.4,
    image: "🍅",
    location: "Kano",
    promoted: false,
  },
  {
    id: "3",
    name: "Rice Paddy",
    price: 65000,
    seller: "Delta Agro",
    rating: 4.8,
    image: "🌾",
    location: "Asaba",
    promoted: true,
  },
  {
    id: "4",
    name: "Cassava Tubers",
    price: 8000,
    seller: "Ogun Coop",
    rating: 4.2,
    image: "🥔",
    location: "Ogun",
    promoted: false,
  },
  {
    id: "5",
    name: "Palm Oil (25L)",
    price: 32000,
    seller: "Cross River",
    rating: 4.7,
    image: "🫒",
    location: "Lagos",
    promoted: false,
  },
  {
    id: "6",
    name: "Yam Tubers",
    price: 18000,
    seller: "Benue Farms",
    rating: 4.5,
    image: "🍠",
    location: "Benue",
    promoted: false,
  },
  {
    id: "7",
    name: "Groundnut (50kg)",
    price: 22000,
    seller: "Zaria Traders",
    rating: 4.3,
    image: "🥜",
    location: "Zaria",
    promoted: true,
  },
  {
    id: "8",
    name: "Millet",
    price: 15000,
    seller: "Kaduna Coop",
    rating: 4.1,
    image: "🌾",
    location: "Kaduna",
    promoted: false,
  },
];

export const jobs = [
  {
    id: "1",
    title: "Farm Manager",
    company: "GreenFields Ltd",
    location: "Kano",
    salary: "₦250k/mo",
    type: "Full-time",
    promoted: true,
  },
  {
    id: "2",
    title: "Irrigation Technician",
    company: "Delta Agro",
    location: "Asaba",
    salary: "₦180k/mo",
    type: "Contract",
    promoted: false,
  },
  {
    id: "3",
    title: "Livestock Handler",
    company: "Sahel Ranch",
    location: "Kaduna",
    salary: "₦120k/mo",
    type: "Full-time",
    promoted: false,
  },
  {
    id: "4",
    title: "Agro Sales Rep",
    company: "FarmX Partner",
    location: "Lagos",
    salary: "₦200k/mo",
    type: "Remote",
    promoted: false,
  },
  {
    id: "5",
    title: "Warehouse Supervisor",
    company: "Kano Farms",
    location: "Kano",
    salary: "₦150k/mo",
    type: "Full-time",
    promoted: true,
  },
];

export const tutorials = [
  {
    id: "1",
    title: "Modern Irrigation Techniques",
    duration: "12 min",
    level: "Beginner",
    icon: "💧",
  },
  {
    id: "2",
    title: "Poultry Disease Prevention",
    duration: "18 min",
    level: "Intermediate",
    icon: "🐔",
  },
  { id: "3", title: "Organic Fertilizer Making", duration: "9 min", level: "Beginner", icon: "🌱" },
  { id: "4", title: "Post-harvest Storage", duration: "15 min", level: "Advanced", icon: "📦" },
];

export const transactions = [
  { id: "1", type: "deposit", label: "Wallet top-up (Paystack)", amount: 50000, date: "Today" },
  { id: "2", type: "withdraw", label: "Sold 100kg maize", amount: 45000, date: "Yesterday" },
  { id: "3", type: "transfer", label: "TOP promo — Maize", amount: -2799, date: "2 days ago" },
  { id: "4", type: "transfer", label: "Premium subscription", amount: -11200, date: "1 week ago" },
];

export const partners = [
  { id: "1", name: "Ministry of Agriculture", type: "Government", verified: true, logo: "🏛️" },
  { id: "2", name: "AgroFund NGO", type: "NGO", verified: true, logo: "🤝" },
  { id: "3", name: "GreenFields Ltd", type: "Company", verified: true, logo: "🌾" },
  { id: "4", name: "Sahel Ranch", type: "Company", verified: false, logo: "🐄" },
];

export const posts = [
  {
    id: "1",
    author: "Aisha M.",
    handle: "@aisha",
    time: "2h",
    content: "Just harvested 3 tons of tomatoes this season! Alhamdulillah 🍅",
    likes: 128,
    comments: 24,
  },
  {
    id: "2",
    author: "GreenFields Ltd",
    handle: "@greenfields",
    time: "5h",
    content: "We're hiring farm managers in Kano. Apply through FarmX Jobs.",
    likes: 89,
    comments: 12,
  },
  {
    id: "3",
    author: "Ibrahim K.",
    handle: "@ibrahim",
    time: "1d",
    content: "Anyone using drip irrigation? Looking for tips on maintenance.",
    likes: 45,
    comments: 31,
  },
];

export const news = [
  {
    id: "1",
    title: "Government launches ₦50B agro-loan scheme",
    source: "FarmX News",
    time: "1h ago",
  },
  {
    id: "2",
    title: "Rainy season forecast: above-average yields expected",
    source: "NiMet",
    time: "4h ago",
  },
  {
    id: "3",
    title: "New export corridor opens for African crops",
    source: "Enterprise Update",
    time: "1d ago",
  },
];

export const notifications = [
  {
    id: "1",
    title: "New product from GreenFields",
    body: "Fresh maize now available",
    time: "10m",
    unread: true,
  },
  {
    id: "2",
    title: "Payment received",
    body: "₦45,000 credited to wallet",
    time: "2h",
    unread: true,
  },
  { id: "3", title: "New follower", body: "Sahel Ranch followed you", time: "1d", unread: false },
];

// Pricing (Naira)
export const PRICING = {
  promoTop: 2799,
  promoWeek: 2799,
  promoMonth: 2799,
  jobPromoMin: 2000,
  jobPromoMax: 3000,
  bluetekMonthly: 4500,
} as const;
