import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { createServerFn } from "@tanstack/react-start";
import { requireAuthenticatedUser } from "@/lib/auth-server";
import { z } from "zod";
import type {
  ListingAvailability,
  ListingCondition,
  ListingPriceType,
  ListingStatus,
  MarketListing,
  SellerType,
  VerificationLevel,
} from "@/lib/market-dev-data";
import { getCategory, getSubcategory } from "@/lib/market-categories";
import { getAwsClientOptions } from "@/lib/aws-config";

const marketFiltersSchema = z
  .object({
    category: z.string().optional(),
    subcategory: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    sellerType: z.enum(["individual", "business"]).optional(),
    verification: z.enum(["verified_seller", "verified_business"]).optional(),
    condition: z.string().optional(),
    availability: z
      .enum([
        "available",
        "limited",
        "unavailable",
        "in_stock",
        "out_of_stock",
        "pre_order",
        "busy",
        "appointment",
      ])
      .optional(),
    priceMin: z.number().optional(),
    priceMax: z.number().optional(),
    priceType: z.enum(["fixed", "negotiable"]).optional(),
    featured: z.boolean().optional(),
    sponsored: z.boolean().optional(),
    radiusKm: z.number().optional(),
  })
  .optional();

const marketQuerySchema = z.object({
  query: z.string().optional(),
  filters: marketFiltersSchema,
  sort: z
    .enum([
      "relevant",
      "newest",
      "oldest",
      "price_low",
      "price_high",
      "views",
      "saves",
      "inquiries",
      "nearest",
    ])
    .optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(50).optional(),
});

const listingStatus: ListingStatus = "published";

type PublicMarketPage = {
  listings: MarketListing[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

function getMarketConfig() {
  const tableName = process.env.FARMX_LISTINGS_TABLE;
  const region = process.env.AWS_REGION;
  if (!tableName || !region) {
    throw new Error(
      "Market service is not configured. Set AWS_REGION and FARMX_LISTINGS_TABLE on the server.",
    );
  }
  return { tableName, region };
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function parseLocation(value: string) {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    city: parts[0] ?? "",
    lga: parts[1] ?? "",
    state: parts[2] ?? parts[1] ?? parts[0] ?? "Nigeria",
  };
}

function validPriceType(value: unknown, price: number | null): ListingPriceType {
  if (value === "negotiable" || value === "request" || value === "free" || value === "fixed") {
    return value;
  }
  return price === null ? "request" : "fixed";
}

function validCondition(value: unknown): ListingCondition {
  const allowed: ListingCondition[] = ["new", "used", "refurbished", "fresh", "for_parts", "other"];
  return allowed.includes(value as ListingCondition) ? (value as ListingCondition) : "other";
}

function validAvailability(value: unknown): ListingAvailability {
  const allowed: ListingAvailability[] = [
    "available",
    "limited",
    "unavailable",
    "in_stock",
    "out_of_stock",
    "pre_order",
    "busy",
    "appointment",
  ];
  return allowed.includes(value as ListingAvailability)
    ? (value as ListingAvailability)
    : "available";
}

function toMarketListing(item: Record<string, unknown>): MarketListing {
  const metadata =
    item.metadata && typeof item.metadata === "object"
      ? (item.metadata as Record<string, unknown>)
      : {};
  const categoryId = text(item.category);
  const subcategoryId = text(item.subcategory);
  const categoryEntity = getCategory(categoryId);
  const subcategoryEntity = getSubcategory(categoryId, subcategoryId);
  const category = categoryEntity?.name ?? categoryId;
  const subcategory = subcategoryEntity?.name ?? subcategoryId;
  const price = typeof item.price === "number" ? item.price : null;
  const location = parseLocation(text(item.location));
  const images = stringArray(item.imageKeys);
  const sellerName = text(item.sellerName, "FarmX Member");
  const sellerUsername = text(
    item.sellerUsername,
    sellerName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 20),
  );
  const sellerPhone = text(item.sellerPhone);
  const sellerType: SellerType = metadata.sellerType === "business" ? "business" : "individual";
  const sellerVerification: VerificationLevel = sellerPhone ? "phone" : "none";
  const promoExpiresAt = text(item.promoExpiresAt);
  const activePromotion = Boolean(promoExpiresAt && promoExpiresAt > new Date().toISOString());
  const stats =
    item.stats && typeof item.stats === "object" ? (item.stats as Record<string, unknown>) : {};

  return {
    id: text(item.listingId, text(item.pk).replace(/^LISTING#/, "")),
    title: text(item.title, "Untitled listing"),
    description: text(item.description),
    price,
    unit: text(metadata.unit, text(metadata.priceUnit, "per item")),
    priceType: validPriceType(metadata.priceType, price),
    category,
    subcategory,
    condition: validCondition(metadata.condition),
    quantity: numberValue(metadata.quantity),
    availability: validAvailability(metadata.availability),
    status: listingStatus,
    state: location.state,
    city: location.city,
    lga: location.lga,
    seller: {
      name: sellerName,
      username: sellerUsername,
      type: sellerType,
      verification: sellerVerification,
      rating: numberValue(item.sellerRating),
      reviews: numberValue(item.sellerReviews),
      followers: numberValue(item.sellerFollowers),
      activeListings: numberValue(item.sellerActiveListings),
      location: text(item.sellerLocation, text(item.location)),
      phoneVerified: Boolean(sellerPhone),
      emailVerified: Boolean(text(item.sellerEmail)),
      photo: text(item.sellerPhotoKey),
    },
    images,
    imagePlaceholder: "",
    featured: activePromotion,
    sponsored: activePromotion,
    createdAt: text(item.createdAt, new Date(0).toISOString()),
    updatedAt: text(item.updatedAt, text(item.createdAt, new Date(0).toISOString())),
    stats: {
      views: numberValue(stats.views, numberValue(item.views)),
      saves: numberValue(stats.saves, numberValue(item.saves)),
      shares: numberValue(stats.shares, numberValue(item.shares)),
      inquiries: numberValue(stats.inquiries, numberValue(item.inquiries)),
    },
    tags:
      stringArray(metadata.tags).length > 0 ? stringArray(metadata.tags) : [category, subcategory],
    metadata: {
      ...Object.fromEntries(
        Object.entries(metadata).filter(
          ([key]) => !["contactPhone", "contactName", "promoId", "videoLink"].includes(key),
        ),
      ),
      sourceCategoryId: categoryId,
      sourceSubcategoryId: subcategoryId,
    },
  };
}

function matchesQuery(listing: MarketListing, data: z.infer<typeof marketQuerySchema>) {
  const search = data.query?.trim().toLowerCase() ?? "";
  const filters = data.filters ?? {};
  const searchable = [
    listing.title,
    listing.description,
    listing.category,
    listing.subcategory,
    listing.state,
    listing.city,
    listing.seller.name,
    ...listing.tags,
  ]
    .join(" ")
    .toLowerCase();
  if (search && !searchable.includes(search)) return false;
  if (
    filters.category &&
    listing.category !== filters.category &&
    listing.metadata?.sourceCategoryId !== filters.category
  )
    return false;
  if (
    filters.subcategory &&
    listing.subcategory !== filters.subcategory &&
    listing.metadata?.sourceSubcategoryId !== filters.subcategory
  )
    return false;
  if (filters.state && listing.state !== filters.state) return false;
  if (filters.city && listing.city !== filters.city) return false;
  if (filters.sellerType && listing.seller.type !== filters.sellerType) return false;
  if (filters.verification && listing.seller.verification !== filters.verification) return false;
  if (filters.condition && listing.condition !== filters.condition) return false;
  if (filters.availability && listing.availability !== filters.availability) return false;
  if (filters.priceType && listing.priceType !== filters.priceType) return false;
  if (filters.featured !== undefined && listing.featured !== filters.featured) return false;
  if (filters.sponsored !== undefined && listing.sponsored !== filters.sponsored) return false;
  if (
    filters.priceMin !== undefined &&
    (listing.price === null || listing.price < filters.priceMin)
  )
    return false;
  if (
    filters.priceMax !== undefined &&
    (listing.price === null || listing.price > filters.priceMax)
  )
    return false;
  return true;
}

function sortListings(listings: MarketListing[], sort = "newest") {
  return [...listings].sort((a, b) => {
    switch (sort) {
      case "oldest":
        return a.createdAt.localeCompare(b.createdAt);
      case "price_low":
        return (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY);
      case "price_high":
        return (b.price ?? -1) - (a.price ?? -1);
      case "views":
        return b.stats.views - a.stats.views;
      case "saves":
        return b.stats.saves - a.stats.saves;
      case "inquiries":
        return b.stats.inquiries - a.stats.inquiries;
      case "relevant":
        return Number(b.featured) - Number(a.featured) || b.stats.views - a.stats.views;
      case "newest":
      default:
        return b.createdAt.localeCompare(a.createdAt);
    }
  });
}

async function getActiveItems() {
  const { tableName, region } = getMarketConfig();
  const client = DynamoDBDocumentClient.from(new DynamoDBClient(getAwsClientOptions(region)));
  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "GSI1",
      KeyConditionExpression: "gsi1pk = :active",
      ExpressionAttributeValues: { ":active": "LISTING_STATUS#ACTIVE" },
      ScanIndexForward: false,
      Limit: 200,
    }),
  );
  return (result.Items ?? []) as Record<string, unknown>[];
}

export const getPublicMarketListings = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => marketQuerySchema.parse(input ?? {}))
  .handler(async ({ data }): Promise<PublicMarketPage> => {
    const listings = sortListings(
      (await getActiveItems())
        .map(toMarketListing)
        .filter((listing) => matchesQuery(listing, data)),
      data.sort,
    );
    const page = data.page ?? 1;
    const pageSize = data.pageSize ?? 12;
    const start = (page - 1) * pageSize;
    return {
      listings: listings.slice(start, start + pageSize),
      total: listings.length,
      page,
      pageSize,
      hasMore: start + pageSize < listings.length,
    };
  });

export const getPublicMarketListing = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }): Promise<MarketListing | null> => {
    const { tableName, region } = getMarketConfig();
    const client = DynamoDBDocumentClient.from(new DynamoDBClient(getAwsClientOptions(region)));
    const result = await client.send(
      new GetCommand({
        TableName: tableName,
        Key: { pk: `LISTING#${data.id}`, sk: `LISTING#${data.id}` },
      }),
    );
    const item = result.Item as Record<string, unknown> | undefined;
    if (!item || !["ACTIVE", "published"].includes(String(item.status))) return null;
    return toMarketListing({ ...item, status: "ACTIVE" });
  });

export { toMarketListing };

const listingIdSchema = z.object({ listingId: z.string().trim().min(1).max(128) });
const sellerNameSchema = z.object({ sellerName: z.string().trim().min(1).max(128) });

export const saveListing = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => listingIdSchema.parse(input))
  .handler(async ({ data }) => {
    const region = process.env.AWS_REGION;
    const profileTable = process.env.FARMX_PROFILE_TABLE;
    if (!region || !profileTable) throw new Error("Profile table not configured.");
    const actor = await requireAuthenticatedUser();
    const client = DynamoDBDocumentClient.from(new DynamoDBClient(getAwsClientOptions(region)));
    const now = new Date().toISOString();

    await client.send(
      new PutCommand({
        TableName: profileTable,
        Item: {
          pk: `USER#${actor.userId}`,
          sk: `SAVED_LISTING#${data.listingId}`,
          entityType: "SAVED_LISTING",
          listingId: data.listingId,
          createdAt: now,
        },
      }),
    );
    return { saved: true };
  });

export const unsaveListing = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => listingIdSchema.parse(input))
  .handler(async ({ data }) => {
    const region = process.env.AWS_REGION;
    const profileTable = process.env.FARMX_PROFILE_TABLE;
    if (!region || !profileTable) throw new Error("Profile table not configured.");
    const actor = await requireAuthenticatedUser();
    const client = DynamoDBDocumentClient.from(new DynamoDBClient(getAwsClientOptions(region)));

    await client.send(
      new DeleteCommand({
        TableName: profileTable,
        Key: { pk: `USER#${actor.userId}`, sk: `SAVED_LISTING#${data.listingId}` },
      }),
    );
    return { unsaved: true };
  });

export const followSeller = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => sellerNameSchema.parse(input))
  .handler(async ({ data }) => {
    const region = process.env.AWS_REGION;
    const profileTable = process.env.FARMX_PROFILE_TABLE;
    if (!region || !profileTable) throw new Error("Profile table not configured.");
    const actor = await requireAuthenticatedUser();
    const client = DynamoDBDocumentClient.from(new DynamoDBClient(getAwsClientOptions(region)));
    const now = new Date().toISOString();

    await client.send(
      new PutCommand({
        TableName: profileTable,
        Item: {
          pk: `USER#${actor.userId}`,
          sk: `FOLLOWING_SELLER#${data.sellerName}`,
          entityType: "FOLLOWING_SELLER",
          sellerName: data.sellerName,
          createdAt: now,
        },
      }),
    );
    return { followed: true };
  });

export const unfollowSeller = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => sellerNameSchema.parse(input))
  .handler(async ({ data }) => {
    const region = process.env.AWS_REGION;
    const profileTable = process.env.FARMX_PROFILE_TABLE;
    if (!region || !profileTable) throw new Error("Profile table not configured.");
    const actor = await requireAuthenticatedUser();
    const client = DynamoDBDocumentClient.from(new DynamoDBClient(getAwsClientOptions(region)));

    await client.send(
      new DeleteCommand({
        TableName: profileTable,
        Key: { pk: `USER#${actor.userId}`, sk: `FOLLOWING_SELLER#${data.sellerName}` },
      }),
    );
    return { unfollowed: true };
  });

export const recordListingView = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => listingIdSchema.parse(input))
  .handler(async ({ data }) => {
    const config = getMarketConfig();
    const client = DynamoDBDocumentClient.from(
      new DynamoDBClient(getAwsClientOptions(config.region)),
    );

    await client.send(
      new UpdateCommand({
        TableName: config.tableName,
        Key: { pk: `LISTING#${data.listingId}`, sk: `LISTING#${data.listingId}` },
        UpdateExpression: "SET viewCount = if_not_exists(viewCount, :zero) + :inc",
        ExpressionAttributeValues: { ":zero": 0, ":inc": 1 },
      }),
    );
    return { recorded: true };
  });

export const getSavedListings = createServerFn({ method: "GET" }).handler(async () => {
  const region = process.env.AWS_REGION;
  const profileTable = process.env.FARMX_PROFILE_TABLE;
  const listingsTable = process.env.FARMX_LISTINGS_TABLE;
  if (!region || !profileTable || !listingsTable) throw new Error("Tables not configured.");

  const actor = await requireAuthenticatedUser();
  const client = DynamoDBDocumentClient.from(new DynamoDBClient(getAwsClientOptions(region)));

  const savedResult = await client.send(
    new QueryCommand({
      TableName: profileTable,
      KeyConditionExpression: "pk = :user AND begins_with(sk, :saved)",
      ExpressionAttributeValues: { ":user": `USER#${actor.userId}`, ":saved": "SAVED_LISTING#" },
    }),
  );

  const savedItems = savedResult.Items ?? [];
  if (savedItems.length === 0) return [];

  const listingIds = savedItems.map((item) => String(item.listingId));
  const listingPromises = listingIds.map((id) =>
    client.send(
      new GetCommand({
        TableName: listingsTable,
        Key: { pk: `LISTING#${id}`, sk: `LISTING#${id}` },
      }),
    ),
  );

  const results = await Promise.all(listingPromises);
  return results
    .map((res) => res.Item as Record<string, unknown> | undefined)
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && (item as Record<string, unknown>).status === "ACTIVE",
    )
    .map(toMarketListing);
});
