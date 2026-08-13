export const COMMUNITY_TOPICS = [
  { id: "agriculture", label: "Agriculture", group: "Agriculture" },
  { id: "crop-farming", label: "Crop Farming", group: "Agriculture" },
  { id: "livestock", label: "Livestock", group: "Agriculture" },
  { id: "poultry", label: "Poultry", group: "Agriculture" },
  { id: "aquaculture", label: "Aquaculture", group: "Agriculture" },
  { id: "greenhouse", label: "Greenhouse Farming", group: "Agriculture" },
  { id: "irrigation", label: "Irrigation", group: "Agriculture" },
  { id: "seeds", label: "Seeds", group: "Agriculture" },
  { id: "fertilizer", label: "Fertilizer", group: "Agriculture" },
  { id: "pest-disease", label: "Pest & Disease", group: "Agriculture" },
  { id: "farm-equipment", label: "Farm Equipment", group: "Agriculture" },
  { id: "farm-machinery", label: "Farm Machinery", group: "Agriculture" },
  { id: "solar-energy", label: "Solar & Energy", group: "Technology" },
  { id: "agritech", label: "Agritech", group: "Technology" },
  { id: "agricultural-technology", label: "Agricultural Technology", group: "Technology" },
  { id: "agribusiness", label: "Agribusiness", group: "Business" },
  { id: "food-produce", label: "Food & Produce", group: "Business" },
  { id: "market-prices", label: "Market & Prices", group: "Business" },
  { id: "finance-business", label: "Finance & Business", group: "Business" },
  { id: "jobs-opportunities", label: "Jobs & Opportunities", group: "Business" },
  { id: "innovation", label: "Innovation", group: "Technology" },
  { id: "climate-sustainability", label: "Climate & Sustainability", group: "Technology" },
  { id: "general", label: "General Discussion", group: "General" },
] as const;

export type CommunityTopic = (typeof COMMUNITY_TOPICS)[number]["id"];
export type CommunityFeedTab = "latest" | "popular" | "following";
export type CommunityPostType =
  | "text"
  | "photo"
  | "video"
  | "question"
  | "farm_update"
  | "advice"
  | "discussion"
  | "announcement";
export type CommunityMediaKind = "image" | "video";
export type CommunityReportReason =
  | "spam"
  | "scam"
  | "harassment"
  | "false_information"
  | "inappropriate"
  | "prohibited"
  | "duplicate"
  | "other";

export type CommunityAuthor = {
  id: string;
  name: string;
  username: string;
  role?: string;
  photo?: string;
  verified?: boolean;
  official?: boolean;
};

export type CommunityLocation = {
  state?: string;
  city?: string;
  area?: string;
};

export type CommunityMedia = {
  id: string;
  kind: CommunityMediaKind;
  url: string;
  thumbnailUrl?: string;
  alt?: string;
};

export type CommunityListingReference = {
  id: string;
  title: string;
  price: number | null;
  image?: string;
  location?: string;
  status?: "published" | "sold" | "unavailable" | "closed";
};

export type CommunityComment = {
  id: string;
  postId: string;
  parentId?: string;
  author: CommunityAuthor;
  content: string;
  createdAt: string;
  updatedAt?: string;
  edited?: boolean;
  likeCount: number;
  likedByMe: boolean;
  replies?: CommunityComment[];
  accepted?: boolean;
  deleted?: boolean;
};

export type CommunityPost = {
  id: string;
  author: CommunityAuthor;
  content: string;
  postType: CommunityPostType;
  topic: CommunityTopic;
  media: CommunityMedia[];
  listing?: CommunityListingReference;
  location?: CommunityLocation;
  createdAt: string;
  updatedAt?: string;
  edited?: boolean;
  deleted?: boolean;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  followingAuthor: boolean;
};

export type CommunityFeed = {
  posts: CommunityPost[];
  nextCursor?: string;
  hasMore: boolean;
};

export type CommunityCommentPage = {
  comments: CommunityComment[];
  nextCursor?: string;
  hasMore: boolean;
};

export type CreateCommunityPostInput = {
  content: string;
  postType: CommunityPostType;
  topic: CommunityTopic;
  media?: Omit<CommunityMedia, "id">[];
  listing?: CommunityListingReference;
  location?: CommunityLocation;
};

export type CreateCommunityCommentInput = {
  postId: string;
  content: string;
  parentId?: string;
};

export const COMMUNITY_REPORT_REASONS: { id: CommunityReportReason; label: string }[] = [
  { id: "spam", label: "Spam" },
  { id: "scam", label: "Scam" },
  { id: "harassment", label: "Harassment" },
  { id: "false_information", label: "False information" },
  { id: "inappropriate", label: "Inappropriate content" },
  { id: "prohibited", label: "Prohibited content" },
  { id: "duplicate", label: "Duplicate" },
  { id: "other", label: "Other" },
];
