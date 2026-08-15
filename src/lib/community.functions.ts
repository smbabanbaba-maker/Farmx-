import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeaders } from "@tanstack/react-start/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { getAwsClientOptions } from "@/lib/aws-config";
import { requireAuthenticatedUser } from "@/lib/auth-server";
import type {
  CommunityAuthor,
  CommunityComment,
  CommunityFeed,
  CommunityListingReference,
  CommunityLocation,
  CommunityMedia,
  CommunityPost,
  CommunityReportReason,
  CommunityTopic,
  CreateCommunityCommentInput,
  CreateCommunityPostInput,
} from "@/lib/community.types";

const topicIds = [
  "agriculture",
  "crop-farming",
  "livestock",
  "poultry",
  "aquaculture",
  "greenhouse",
  "irrigation",
  "seeds",
  "fertilizer",
  "pest-disease",
  "farm-equipment",
  "farm-machinery",
  "solar-energy",
  "agritech",
  "agricultural-technology",
  "agribusiness",
  "food-produce",
  "market-prices",
  "finance-business",
  "jobs-opportunities",
  "innovation",
  "climate-sustainability",
  "general",
] as const;
const postTypes = [
  "text",
  "photo",
  "video",
  "question",
  "farm_update",
  "advice",
  "discussion",
  "announcement",
] as const;
const reportReasons = [
  "spam",
  "scam",
  "harassment",
  "false_information",
  "inappropriate",
  "prohibited",
  "duplicate",
  "other",
] as const;

const locationSchema = z
  .object({
    state: z.string().trim().max(80).optional(),
    city: z.string().trim().max(80).optional(),
    area: z.string().trim().max(120).optional(),
  })
  .optional();
const mediaSchema = z.object({
  kind: z.enum(["image", "video"]),
  url: z.string().trim().min(1).max(2000),
  thumbnailUrl: z.string().trim().max(2000).optional(),
  alt: z.string().trim().max(160).optional(),
});
const listingSchema = z.object({
  id: z.string().trim().min(1).max(128),
  title: z.string().trim().min(1).max(160),
  price: z.number().nullable(),
  image: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(160).optional(),
  status: z.enum(["published", "sold", "unavailable", "closed"]).optional(),
});
const postInputSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  postType: z.enum(postTypes),
  topic: z.enum(topicIds),
  media: z.array(mediaSchema).max(10).optional(),
  listing: listingSchema.optional(),
  location: locationSchema,
});
const postIdSchema = z.object({ postId: z.string().trim().min(1).max(128) });
const commentInputSchema = z.object({
  postId: z.string().trim().min(1).max(128),
  content: z.string().trim().min(1).max(1000),
  parentId: z.string().trim().max(128).optional(),
});
const commentLikeSchema = z.object({
  postId: z.string().trim().min(1).max(128),
  commentId: z.string().trim().min(1).max(128),
});
const feedSchema = z.object({
  tab: z.enum(["latest", "popular", "following"]).default("latest"),
  topic: z.enum(topicIds).optional(),
  search: z.string().trim().max(120).optional(),
  cursor: z.string().max(500).optional(),
  limit: z.number().int().min(1).max(30).default(20),
});
const followSchema = z.object({
  targetUserId: z.string().trim().min(1).max(128),
  targetUsername: z.string().trim().min(3).max(32),
});
const reportSchema = z.object({
  postId: z.string().trim().min(1).max(128),
  reason: z.enum(reportReasons),
  details: z.string().trim().max(1000).optional(),
});
const uploadKeySchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]),
  extension: z.enum(["jpg", "jpeg", "png", "webp", "mp4", "webm"]),
});
const notificationQuerySchema = z.object({ limit: z.number().int().min(1).max(100).default(100) });
const notificationIdSchema = z.object({ notificationId: z.string().trim().min(1).max(200) });

export type CommunityRuntimeMode = "preview" | "production";

type CommunityConfig = {
  region: string;
  communityTable: string;
  profileTable: string;
  listingsTable: string;
  userPoolId: string;
  clientId: string;
};
type CommunityItem = Record<string, unknown> & { pk: string; sk: string; entityType: string };
const rateBuckets = new Map<string, { startedAt: number; count: number }>();
function enforceRateLimit(userId: string, action: string, max: number, windowMs: number) {
  const key = `${action}:${userId}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= windowMs) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return;
  }
  if (bucket.count >= max)
    throw new Error("You are doing that too often. Please try again shortly.");
  bucket.count += 1;
}

function hasProductionConfig() {
  return Boolean(
    process.env.AWS_REGION &&
    process.env.FARMX_COMMUNITY_TABLE &&
    process.env.FARMX_PROFILE_TABLE &&
    process.env.FARMX_LISTINGS_TABLE &&
    (process.env.COGNITO_USER_POOL_ID ?? process.env.VITE_COGNITO_USER_POOL_ID) &&
    (process.env.COGNITO_WEB_CLIENT_ID ?? process.env.VITE_COGNITO_WEB_CLIENT_ID),
  );
}

export const getCommunityRuntimeMode = createServerFn({ method: "GET" }).handler(async () => ({
  mode: (hasProductionConfig() ? "production" : "preview") as CommunityRuntimeMode,
}));
export const getCommunityViewer = createServerFn({ method: "GET" }).handler(async () => {
  if (!hasProductionConfig()) return { userId: "preview-user" };
  const actor = await requireUser();
  return { userId: actor.userId };
});

export const getCommunityNotifications = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => notificationQuerySchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireUser();
    const result = await documentClient(config.region).send(
      new QueryCommand({
        TableName: config.profileTable,
        KeyConditionExpression: "pk = :user AND begins_with(sk, :prefix)",
        ExpressionAttributeValues: { ":user": `USER#${actor.userId}`, ":prefix": "NOTIFICATION#" },
        ScanIndexForward: false,
        Limit: data.limit,
      }),
    );
    return (result.Items ?? []).map((item) => ({
      id: String(item.notificationId ?? item.sk),
      eventId:
        typeof item.eventId === "string" ? item.eventId : String(item.notificationId ?? item.sk),
      category:
        item.category === "followers"
          ? "followers"
          : item.category === "community"
            ? "community"
            : "system",
      type:
        item.type === "followers"
          ? "followers"
          : item.type === "community"
            ? "community"
            : "system",
      title: String(item.title ?? "FarmX notification"),
      body: String(item.body ?? ""),
      at: Date.parse(String(item.createdAt ?? "")) || Date.now(),
      read: item.read === true,
      communityPostId: typeof item.communityPostId === "string" ? item.communityPostId : undefined,
      actor:
        typeof item.actorId === "string"
          ? {
              id: item.actorId,
              name: typeof item.actorName === "string" ? item.actorName : "FarmX member",
            }
          : undefined,
      targetUrl: typeof item.targetUrl === "string" ? item.targetUrl : undefined,
    }));
  });

export const markCommunityNotificationRead = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => notificationIdSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireUser();
    const client = documentClient(config.region);
    const result = await client.send(
      new QueryCommand({
        TableName: config.profileTable,
        KeyConditionExpression: "pk = :user AND begins_with(sk, :prefix)",
        FilterExpression: "notificationId = :notificationId",
        ExpressionAttributeValues: {
          ":user": `USER#${actor.userId}`,
          ":prefix": "NOTIFICATION#",
          ":notificationId": data.notificationId,
        },
        ProjectionExpression: "pk, sk",
        Limit: 100,
      }),
    );
    const item = result.Items?.[0];
    if (item?.pk && item.sk)
      await client.send(
        new UpdateCommand({
          TableName: config.profileTable,
          Key: { pk: item.pk, sk: item.sk },
          UpdateExpression: "SET #read = :read, readAt = :readAt",
          ExpressionAttributeNames: { "#read": "read" },
          ExpressionAttributeValues: { ":read": true, ":readAt": new Date().toISOString() },
        }),
      );
    return { marked: Boolean(item) };
  });

function getConfig(): CommunityConfig {
  const region = process.env.AWS_REGION;
  const communityTable = process.env.FARMX_COMMUNITY_TABLE;
  const profileTable = process.env.FARMX_PROFILE_TABLE;
  const listingsTable = process.env.FARMX_LISTINGS_TABLE;
  if (!region || !communityTable || !profileTable || !listingsTable)
    throw new Error(
      "Community service is not configured. Set AWS_REGION, FARMX_COMMUNITY_TABLE, FARMX_PROFILE_TABLE, and FARMX_LISTINGS_TABLE on the FarmX server.",
    );
  return {
    region,
    communityTable,
    profileTable,
    listingsTable,
    userPoolId: "",
    clientId: "",
  };
}

function documentClient(region: string) {
  return DynamoDBDocumentClient.from(new DynamoDBClient(getAwsClientOptions(region)), {
    marshallOptions: { removeUndefinedValues: true },
  });
}
function privateResponse() {
  setResponseHeaders(new Headers({ "Cache-Control": "no-store", Vary: "Cookie, Authorization" }));
}
async function requireUser() {
  const actor = await requireAuthenticatedUser();
  return { userId: actor.userId, email: actor.email };
}

function authorFromItem(item: CommunityItem): CommunityAuthor {
  return {
    id: String(item.authorId),
    name: String(item.authorName ?? "FarmX member"),
    username: String(item.authorUsername ?? "farmx_member"),
    role: typeof item.authorRole === "string" ? item.authorRole : undefined,
    photo: typeof item.authorPhoto === "string" ? item.authorPhoto : undefined,
    verified: item.authorVerified === true,
    official: item.authorOfficial === true,
  };
}
function listingFromItem(item: CommunityItem): CommunityListingReference | undefined {
  if (!item.listingId || !item.listingTitle) return undefined;
  return {
    id: String(item.listingId),
    title: String(item.listingTitle),
    price: typeof item.listingPrice === "number" ? item.listingPrice : null,
    image: typeof item.listingImage === "string" ? item.listingImage : undefined,
    location: typeof item.listingLocation === "string" ? item.listingLocation : undefined,
    status: item.listingStatus as CommunityListingReference["status"] | undefined,
  };
}
function postFromItem(item: CommunityItem): CommunityPost {
  return {
    id: String(item.postId),
    author: authorFromItem(item),
    content: String(item.content ?? ""),
    postType: item.postType as CommunityPost["postType"],
    topic: item.topic as CommunityTopic,
    media: (Array.isArray(item.media) ? item.media : []) as CommunityMedia[],
    listing: listingFromItem(item),
    location: item.location as CommunityLocation | undefined,
    createdAt: String(item.createdAt),
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : undefined,
    edited: item.edited === true,
    deleted: item.deletedAt != null,
    likeCount: Number(item.likeCount ?? 0),
    commentCount: Number(item.commentCount ?? 0),
    shareCount: Number(item.shareCount ?? 0),
    saveCount: Number(item.saveCount ?? 0),
    likedByMe: item.likedByMe === true,
    savedByMe: item.savedByMe === true,
    followingAuthor: item.followingAuthor === true,
  };
}
function commentFromItem(item: CommunityItem): CommunityComment {
  return {
    id: String(item.commentId),
    postId: String(item.postId),
    parentId: typeof item.parentId === "string" ? item.parentId : undefined,
    author: authorFromItem(item),
    content: String(item.content ?? ""),
    createdAt: String(item.createdAt),
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : undefined,
    edited: item.edited === true,
    likeCount: Number(item.likeCount ?? 0),
    likedByMe: item.likedByMe === true,
    accepted: item.accepted === true,
    deleted: item.deletedAt != null,
  };
}

async function resolveAuthor(
  client: DynamoDBDocumentClient,
  config: CommunityConfig,
  userId: string,
  email?: string,
) {
  const result = await client.send(
    new GetCommand({
      TableName: config.profileTable,
      Key: { pk: `USER#${userId}`, sk: "PROFILE" },
    }),
  );
  const profile = result.Item as Record<string, unknown> | undefined;
  return {
    id: userId,
    name: typeof profile?.fullName === "string" ? profile.fullName : (email ?? "FarmX member"),
    username:
      typeof profile?.username === "string" ? profile.username : `member_${userId.slice(-8)}`,
    role: typeof profile?.role === "string" ? profile.role : undefined,
    photo: typeof profile?.photoKey === "string" ? profile.photoKey : undefined,
    verified: profile?.verification === "approved",
    official: false,
  } satisfies CommunityAuthor;
}

async function getPostItem(
  client: DynamoDBDocumentClient,
  config: CommunityConfig,
  postId: string,
) {
  const result = await client.send(
    new GetCommand({
      TableName: config.communityTable,
      Key: { pk: `POST#${postId}`, sk: `POST#${postId}` },
    }),
  );
  return result.Item as CommunityItem | undefined;
}
async function writeProfileNotification(
  client: DynamoDBDocumentClient,
  config: CommunityConfig,
  input: {
    recipientId?: string;
    actorId: string;
    actorName: string;
    title: string;
    body: string;
    postId: string;
    eventId: string;
  },
) {
  if (!input.recipientId || input.recipientId === input.actorId) return;
  const now = new Date().toISOString();
  await client.send(
    new PutCommand({
      TableName: config.profileTable,
      Item: {
        pk: `USER#${input.recipientId}`,
        sk: `NOTIFICATION#${now}#${input.eventId}`,
        entityType: "NOTIFICATION",
        notificationId: input.eventId,
        eventId: input.eventId,
        category: "community",
        type: "community",
        title: input.title,
        body: input.body,
        targetUrl: `/community/${input.postId}`,
        communityPostId: input.postId,
        actorId: input.actorId,
        actorName: input.actorName,
        createdAt: now,
        read: false,
      },
      ConditionExpression: "attribute_not_exists(pk)",
    }),
  );
}
async function authorFollowed(
  client: DynamoDBDocumentClient,
  config: CommunityConfig,
  viewerId: string,
  authorId: string,
) {
  if (viewerId === authorId) return false;
  const result = await client.send(
    new GetCommand({
      TableName: config.communityTable,
      Key: { pk: `USER#${viewerId}`, sk: `FOLLOW#${authorId}` },
      ProjectionExpression: "pk",
    }),
  );
  return Boolean(result.Item);
}
async function hydratePost(
  client: DynamoDBDocumentClient,
  config: CommunityConfig,
  item: CommunityItem,
  viewerId: string,
): Promise<CommunityPost> {
  const [like, save, following, liveListingResult] = await Promise.all([
    client.send(
      new GetCommand({
        TableName: config.communityTable,
        Key: { pk: `POST#${item.postId}`, sk: `LIKE#${viewerId}` },
        ProjectionExpression: "pk",
      }),
    ),
    client.send(
      new GetCommand({
        TableName: config.communityTable,
        Key: { pk: `POST#${item.postId}`, sk: `SAVE#${viewerId}` },
        ProjectionExpression: "pk",
      }),
    ),
    authorFollowed(client, config, viewerId, String(item.authorId)),
    item.listingId
      ? client
          .send(
            new GetCommand({
              TableName: config.listingsTable,
              Key: { pk: `LISTING#${item.listingId}`, sk: `LISTING#${item.listingId}` },
            }),
          )
          .catch(() => ({ Item: undefined }))
      : Promise.resolve({ Item: undefined }),
  ]);
  const base = postFromItem(item);
  const live = liveListingResult.Item as Record<string, unknown> | undefined;
  const liveLocation = live?.location as Record<string, unknown> | undefined;
  const liveStatus = typeof live?.status === "string" ? live.status.toUpperCase() : undefined;
  const liveListing =
    base.listing && live
      ? {
          ...base.listing,
          title: typeof live.title === "string" ? live.title : base.listing.title,
          price: typeof live.price === "number" ? live.price : base.listing.price,
          location:
            typeof liveLocation?.city === "string" || typeof liveLocation?.state === "string"
              ? [liveLocation?.city, liveLocation?.state]
                  .filter((value): value is string => typeof value === "string" && value.length > 0)
                  .join(", ")
              : base.listing.location,
          status:
            liveStatus === "ACTIVE" || liveStatus === "PUBLISHED"
              ? ("published" as const)
              : liveStatus === "SOLD"
                ? ("sold" as const)
                : ("unavailable" as const),
        }
      : base.listing;
  return {
    ...base,
    listing: liveListing,
    likedByMe: Boolean(like.Item),
    savedByMe: Boolean(save.Item),
    followingAuthor: following,
  };
}

export const getCommunityFeed = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => feedSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const viewer = await requireUser();
    const client = documentClient(config.region);
    const feedKey = data.topic ? `COMMUNITY_FEED#${data.topic}` : "COMMUNITY_FEED#ALL";
    const result = await client.send(
      new QueryCommand({
        TableName: config.communityTable,
        IndexName: "GSI1",
        KeyConditionExpression: "gsi1pk = :feedKey",
        ExpressionAttributeValues: { ":feedKey": feedKey },
        ScanIndexForward: false,
        Limit: Math.min(data.limit * 3, 90),
        ExclusiveStartKey: data.cursor
          ? JSON.parse(Buffer.from(data.cursor, "base64url").toString("utf8"))
          : undefined,
      }),
    );
    let items = (result.Items ?? []) as CommunityItem[];
    if (data.search) {
      const term = data.search.toLowerCase();
      items = items.filter((item) =>
        `${item.content ?? ""} ${item.topic ?? ""} ${item.authorName ?? ""} ${item.authorUsername ?? ""}`
          .toLowerCase()
          .includes(term),
      );
    }
    let posts = await Promise.all(
      items
        .filter((item) => !item.deletedAt)
        .map((item) => hydratePost(client, config, item, viewer.userId)),
    );
    if (data.tab === "following") posts = posts.filter((post) => post.followingAuthor);
    if (data.tab === "popular")
      posts = posts.sort(
        (a, b) =>
          b.likeCount +
          b.commentCount * 2 +
          b.shareCount * 3 +
          b.saveCount -
          (a.likeCount + a.commentCount * 2 + a.shareCount * 3 + a.saveCount),
      );
    posts = posts.slice(0, data.limit);
    const lastKey = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64url")
      : undefined;
    return { posts, nextCursor: lastKey, hasMore: Boolean(lastKey) } satisfies CommunityFeed;
  });

export const getCommunityPost = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => postIdSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const viewer = await requireUser();
    const item = await getPostItem(documentClient(config.region), config, data.postId);
    if (!item || item.deletedAt) return null;
    return hydratePost(documentClient(config.region), config, item, viewer.userId);
  });

export const createCommunityPost = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => postInputSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireUser();
    enforceRateLimit(actor.userId, "community-post", 8, 10 * 60 * 1000);
    const client = documentClient(config.region);
    const now = new Date().toISOString();
    const postId = crypto.randomUUID();
    const author = await resolveAuthor(client, config, actor.userId, actor.email);
    const item: CommunityItem = {
      pk: `POST#${postId}`,
      sk: `POST#${postId}`,
      entityType: "COMMUNITY_POST",
      postId,
      ownerId: actor.userId,
      authorId: author.id,
      authorName: author.name,
      authorUsername: author.username,
      authorRole: author.role,
      authorPhoto: author.photo,
      authorVerified: author.verified,
      authorOfficial: author.official,
      content: data.content,
      postType: data.postType,
      topic: data.topic,
      media: data.media?.map((media) => ({ ...media, id: crypto.randomUUID() })) ?? [],
      listingId: data.listing?.id,
      listingTitle: data.listing?.title,
      listingPrice: data.listing?.price,
      listingImage: data.listing?.image,
      listingLocation: data.listing?.location,
      listingStatus: data.listing?.status,
      location: data.location,
      createdAt: now,
      updatedAt: now,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      saveCount: 0,
      gsi1pk: `COMMUNITY_FEED#ALL`,
      gsi1sk: `${now}#${postId}`,
      gsi2pk: `AUTHOR#${actor.userId}`,
      gsi2sk: `${now}#${postId}`,
    };
    await client.send(
      new PutCommand({
        TableName: config.communityTable,
        Item: item,
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
    if (data.topic !== "general")
      await client.send(
        new PutCommand({
          TableName: config.communityTable,
          Item: {
            ...item,
            pk: `POST_TOPIC#${postId}`,
            sk: `POST_TOPIC#${postId}`,
            gsi1pk: `COMMUNITY_FEED#${data.topic}`,
            gsi1sk: `${now}#${postId}`,
            entityType: "COMMUNITY_POST_TOPIC",
          },
          ConditionExpression: "attribute_not_exists(pk)",
        }),
      );
    return hydratePost(client, config, item, actor.userId);
  });

export const updateCommunityPost = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    postInputSchema.extend({ postId: postIdSchema.shape.postId }).parse(input),
  )
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireUser();
    const client = documentClient(config.region);
    const existing = await getPostItem(client, config, data.postId);
    if (!existing || existing.ownerId !== actor.userId)
      throw new Error("You can only edit your own Community post.");
    const updatedAt = new Date().toISOString();
    const item: CommunityItem = {
      ...existing,
      content: data.content,
      postType: data.postType,
      topic: data.topic,
      media: data.media?.map((media) => ({ ...media, id: crypto.randomUUID() })) ?? [],
      listingId: data.listing?.id,
      listingTitle: data.listing?.title,
      listingPrice: data.listing?.price,
      listingImage: data.listing?.image,
      listingLocation: data.listing?.location,
      listingStatus: data.listing?.status,
      location: data.location,
      updatedAt,
      edited: true,
    };
    await client.send(
      new PutCommand({
        TableName: config.communityTable,
        Item: item,
        ConditionExpression: "ownerId = :ownerId",
        ExpressionAttributeValues: { ":ownerId": actor.userId },
      }),
    );
    return hydratePost(client, config, item, actor.userId);
  });

export const deleteCommunityPost = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => postIdSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireUser();
    const client = documentClient(config.region);
    const updatedAt = new Date().toISOString();
    await client.send(
      new UpdateCommand({
        TableName: config.communityTable,
        Key: { pk: `POST#${data.postId}`, sk: `POST#${data.postId}` },
        UpdateExpression: "SET deletedAt = :deletedAt, updatedAt = :updatedAt",
        ConditionExpression: "ownerId = :ownerId",
        ExpressionAttributeValues: {
          ":deletedAt": updatedAt,
          ":updatedAt": updatedAt,
          ":ownerId": actor.userId,
        },
      }),
    );
    return { deleted: true, postId: data.postId };
  });

export const toggleCommunityPostLike = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => postIdSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireUser();
    const client = documentClient(config.region);
    const key = { pk: `POST#${data.postId}`, sk: `LIKE#${actor.userId}` };
    const existing = await client.send(
      new GetCommand({ TableName: config.communityTable, Key: key }),
    );
    if (existing.Item) {
      await client.send(new DeleteCommand({ TableName: config.communityTable, Key: key }));
      await client.send(
        new UpdateCommand({
          TableName: config.communityTable,
          Key: { pk: `POST#${data.postId}`, sk: `POST#${data.postId}` },
          UpdateExpression: "SET likeCount = if_not_exists(likeCount, :zero) - :one",
          ExpressionAttributeValues: { ":zero": 0, ":one": 1 },
        }),
      );
      return { liked: false };
    }
    await client.send(
      new PutCommand({
        TableName: config.communityTable,
        Item: {
          ...key,
          entityType: "COMMUNITY_POST_LIKE",
          postId: data.postId,
          userId: actor.userId,
          createdAt: new Date().toISOString(),
        },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
    await client.send(
      new UpdateCommand({
        TableName: config.communityTable,
        Key: { pk: `POST#${data.postId}`, sk: `POST#${data.postId}` },
        UpdateExpression: "SET likeCount = if_not_exists(likeCount, :zero) + :one",
        ExpressionAttributeValues: { ":zero": 0, ":one": 1 },
      }),
    );
    const post = await getPostItem(client, config, data.postId);
    await writeProfileNotification(client, config, {
      recipientId: typeof post?.ownerId === "string" ? post.ownerId : undefined,
      actorId: actor.userId,
      actorName: actor.email ?? "A FarmX member",
      title: "Your Community post got a like",
      body: "Someone liked your Community post.",
      postId: data.postId,
      eventId: `community-like-${data.postId}-${actor.userId}`,
    });
    return { liked: true };
  });

export const getSavedCommunityPosts = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ limit: z.number().int().min(1).max(50).default(30) }).parse(input),
  )
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const viewer = await requireUser();
    const client = documentClient(config.region);
    const saved = await client.send(
      new QueryCommand({
        TableName: config.communityTable,
        IndexName: "GSI2",
        KeyConditionExpression: "gsi2pk = :user AND begins_with(gsi2sk, :saved)",
        ExpressionAttributeValues: { ":user": `USER#${viewer.userId}`, ":saved": "SAVED#" },
        ScanIndexForward: false,
        Limit: data.limit,
      }),
    );
    const posts = await Promise.all(
      ((saved.Items ?? []) as CommunityItem[]).map(async (item) => {
        const post = item.postId
          ? await getPostItem(client, config, String(item.postId))
          : undefined;
        return post && !post.deletedAt ? hydratePost(client, config, post, viewer.userId) : null;
      }),
    );
    return posts.filter((post): post is CommunityPost => Boolean(post));
  });

export const toggleCommunityPostSave = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => postIdSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireUser();
    const client = documentClient(config.region);
    const key = { pk: `POST#${data.postId}`, sk: `SAVE#${actor.userId}` };
    const existing = await client.send(
      new GetCommand({ TableName: config.communityTable, Key: key }),
    );
    if (existing.Item) {
      await client.send(new DeleteCommand({ TableName: config.communityTable, Key: key }));
      await client.send(
        new UpdateCommand({
          TableName: config.communityTable,
          Key: { pk: `POST#${data.postId}`, sk: `POST#${data.postId}` },
          UpdateExpression: "SET saveCount = if_not_exists(saveCount, :zero) - :one",
          ExpressionAttributeValues: { ":zero": 0, ":one": 1 },
        }),
      );
      return { saved: false };
    }
    const savedAt = new Date().toISOString();
    await client.send(
      new PutCommand({
        TableName: config.communityTable,
        Item: {
          ...key,
          gsi2pk: `USER#${actor.userId}`,
          gsi2sk: `SAVED#${savedAt}#${data.postId}`,
          entityType: "COMMUNITY_POST_SAVE",
          postId: data.postId,
          userId: actor.userId,
          createdAt: savedAt,
        },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
    await client.send(
      new UpdateCommand({
        TableName: config.communityTable,
        Key: { pk: `POST#${data.postId}`, sk: `POST#${data.postId}` },
        UpdateExpression: "SET saveCount = if_not_exists(saveCount, :zero) + :one",
        ExpressionAttributeValues: { ":zero": 0, ":one": 1 },
      }),
    );
    return { saved: true };
  });

export const shareCommunityPost = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => postIdSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireUser();
    const client = documentClient(config.region);
    const now = new Date().toISOString();
    await client.send(
      new PutCommand({
        TableName: config.communityTable,
        Item: {
          pk: `POST#${data.postId}`,
          sk: `SHARE#${actor.userId}`,
          entityType: "COMMUNITY_POST_SHARE",
          postId: data.postId,
          userId: actor.userId,
          createdAt: now,
        },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
    await client.send(
      new UpdateCommand({
        TableName: config.communityTable,
        Key: { pk: `POST#${data.postId}`, sk: `POST#${data.postId}` },
        UpdateExpression: "SET shareCount = if_not_exists(shareCount, :zero) + :one",
        ExpressionAttributeValues: { ":zero": 0, ":one": 1 },
      }),
    );
    const post = await getPostItem(client, config, data.postId);
    await writeProfileNotification(client, config, {
      recipientId: typeof post?.ownerId === "string" ? post.ownerId : undefined,
      actorId: actor.userId,
      actorName: actor.email ?? "A FarmX member",
      title: "Your Community post was shared",
      body: "Someone shared your Community post.",
      postId: data.postId,
      eventId: `community-share-${data.postId}-${actor.userId}`,
    });
    return { shared: true, url: `/community/${encodeURIComponent(data.postId)}` };
  });

export const markCommunityAnswer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        postId: z.string().trim().min(1).max(128),
        commentId: z.string().trim().min(1).max(128),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireUser();
    const client = documentClient(config.region);
    const post = await getPostItem(client, config, data.postId);
    if (!post || post.ownerId !== actor.userId || post.postType !== "question")
      throw new Error("Only the question owner can choose a best answer.");
    const commentResult = await client.send(
      new QueryCommand({
        TableName: config.communityTable,
        IndexName: "GSI2",
        KeyConditionExpression: "gsi2pk = :comment",
        ExpressionAttributeValues: { ":comment": `COMMENT#${data.commentId}` },
        Limit: 1,
      }),
    );
    const comment = commentResult.Items?.[0] as CommunityItem | undefined;
    if (!comment || comment.postId !== data.postId)
      throw new Error("That answer could not be found.");
    await client.send(
      new UpdateCommand({
        TableName: config.communityTable,
        Key: { pk: comment.pk, sk: comment.sk },
        UpdateExpression: "SET accepted = :accepted",
        ConditionExpression: "postId = :postId",
        ExpressionAttributeValues: { ":accepted": true, ":postId": data.postId },
      }),
    );
    await writeProfileNotification(client, config, {
      recipientId: typeof comment.authorId === "string" ? comment.authorId : undefined,
      actorId: actor.userId,
      actorName: actor.email ?? "A FarmX member",
      title: "Your answer was marked best",
      body: "The question owner marked your answer as the best answer.",
      postId: data.postId,
      eventId: `community-best-answer-${data.commentId}`,
    });
    return { accepted: true, postId: data.postId, commentId: data.commentId };
  });

export const getCommunityComments = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    postIdSchema
      .extend({
        limit: z.number().int().min(1).max(50).default(30),
        cursor: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const viewer = await requireUser();
    const client = documentClient(config.region);
    const result = await client.send(
      new QueryCommand({
        TableName: config.communityTable,
        IndexName: "GSI1",
        KeyConditionExpression: "gsi1pk = :postComments",
        ExpressionAttributeValues: { ":postComments": `POST#${data.postId}#COMMENTS` },
        ScanIndexForward: true,
        Limit: data.limit,
        ExclusiveStartKey: data.cursor
          ? JSON.parse(Buffer.from(data.cursor, "base64url").toString("utf8"))
          : undefined,
      }),
    );
    const comments = await Promise.all(
      ((result.Items ?? []) as CommunityItem[])
        .filter((item) => !item.deletedAt)
        .map(async (item) => ({
          ...commentFromItem(item),
          likedByMe: Boolean(
            (
              await client.send(
                new GetCommand({
                  TableName: config.communityTable,
                  Key: { pk: `COMMENT#${item.commentId}`, sk: `LIKE#${viewer.userId}` },
                  ProjectionExpression: "pk",
                }),
              )
            ).Item,
          ),
        })),
    );
    return {
      comments,
      nextCursor: result.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64url")
        : undefined,
      hasMore: Boolean(result.LastEvaluatedKey),
    };
  });

export const createCommunityComment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => commentInputSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireUser();
    enforceRateLimit(actor.userId, "community-comment", 30, 10 * 60 * 1000);
    const client = documentClient(config.region);
    const post = await getPostItem(client, config, data.postId);
    if (!post || post.deletedAt) throw new Error("This Community post is no longer available.");
    const author = await resolveAuthor(client, config, actor.userId, actor.email);
    const now = new Date().toISOString();
    const commentId = crypto.randomUUID();
    const item: CommunityItem = {
      pk: `POST#${data.postId}`,
      sk: `COMMENT#${now}#${commentId}`,
      gsi1pk: `POST#${data.postId}#COMMENTS`,
      gsi1sk: `${now}#${commentId}`,
      gsi2pk: `COMMENT#${commentId}`,
      gsi2sk: `POST#${data.postId}`,
      entityType: "COMMUNITY_COMMENT",
      commentId,
      postId: data.postId,
      parentId: data.parentId,
      authorId: author.id,
      authorName: author.name,
      authorUsername: author.username,
      authorRole: author.role,
      authorPhoto: author.photo,
      authorVerified: author.verified,
      content: data.content,
      createdAt: now,
      updatedAt: now,
      likeCount: 0,
    };
    await client.send(
      new PutCommand({
        TableName: config.communityTable,
        Item: item,
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
    await client.send(
      new UpdateCommand({
        TableName: config.communityTable,
        Key: { pk: `POST#${data.postId}`, sk: `POST#${data.postId}` },
        UpdateExpression: "SET commentCount = if_not_exists(commentCount, :zero) + :one",
        ExpressionAttributeValues: { ":zero": 0, ":one": 1 },
      }),
    );
    await writeProfileNotification(client, config, {
      recipientId: typeof post.ownerId === "string" ? post.ownerId : undefined,
      actorId: actor.userId,
      actorName: author.name,
      title: data.parentId
        ? "New reply on your Community post"
        : "New comment on your Community post",
      body: data.parentId
        ? `${author.name} replied to a discussion you started.`
        : `${author.name} commented on your Community post.`,
      postId: data.postId,
      eventId: `community-comment-${commentId}`,
    });
    return commentFromItem(item);
  });

export const toggleCommunityCommentLike = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => commentLikeSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireUser();
    const client = documentClient(config.region);
    const key = { pk: `COMMENT#${data.commentId}`, sk: `LIKE#${actor.userId}` };
    const existing = await client.send(
      new GetCommand({ TableName: config.communityTable, Key: key }),
    );
    if (existing.Item) {
      await client.send(new DeleteCommand({ TableName: config.communityTable, Key: key }));
      return { liked: false };
    }
    await client.send(
      new PutCommand({
        TableName: config.communityTable,
        Item: {
          ...key,
          entityType: "COMMUNITY_COMMENT_LIKE",
          postId: data.postId,
          commentId: data.commentId,
          userId: actor.userId,
          createdAt: new Date().toISOString(),
        },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
    const commentResult = await client.send(
      new QueryCommand({
        TableName: config.communityTable,
        IndexName: "GSI2",
        KeyConditionExpression: "gsi2pk = :comment",
        ExpressionAttributeValues: { ":comment": `COMMENT#${data.commentId}` },
        Limit: 1,
      }),
    );
    const comment = commentResult.Items?.[0] as CommunityItem | undefined;
    await writeProfileNotification(client, config, {
      recipientId: typeof comment?.authorId === "string" ? comment.authorId : undefined,
      actorId: actor.userId,
      actorName: actor.email ?? "A FarmX member",
      title: "Your Community comment got a like",
      body: "Someone liked your comment.",
      postId: data.postId,
      eventId: `community-comment-like-${data.commentId}-${actor.userId}`,
    });
    return { liked: true };
  });

export const toggleCommunityFollow = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => followSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireUser();
    if (actor.userId === data.targetUserId) throw new Error("You cannot follow yourself.");
    const client = documentClient(config.region);
    const key = { pk: `USER#${actor.userId}`, sk: `FOLLOW#${data.targetUserId}` };
    const profileFollowKey = { pk: `USER#${actor.userId}`, sk: `FOLLOWING#${data.targetUserId}` };
    const existing = await client.send(
      new GetCommand({ TableName: config.communityTable, Key: key }),
    );
    if (existing.Item) {
      await Promise.all([
        client.send(new DeleteCommand({ TableName: config.communityTable, Key: key })),
        client.send(new DeleteCommand({ TableName: config.profileTable, Key: profileFollowKey })),
      ]);
      return { following: false };
    }
    const now = new Date().toISOString();
    await Promise.all([
      client.send(
        new PutCommand({
          TableName: config.communityTable,
          Item: {
            ...key,
            entityType: "COMMUNITY_FOLLOW",
            followerId: actor.userId,
            followingId: data.targetUserId,
            followingUsername: data.targetUsername,
            createdAt: now,
          },
          ConditionExpression: "attribute_not_exists(pk)",
        }),
      ),
      client.send(
        new PutCommand({
          TableName: config.profileTable,
          Item: {
            ...profileFollowKey,
            entityType: "PROFILE_FOLLOW",
            followingId: data.targetUserId,
            followingUsername: data.targetUsername,
            createdAt: now,
            gsi1pk: `PROFILE_FOLLOWERS#${data.targetUserId}`,
            gsi1sk: `${now}#${actor.userId}`,
          },
          ConditionExpression: "attribute_not_exists(pk)",
        }),
      ),
    ]);
    const notificationId = crypto.randomUUID();
    await client.send(
      new PutCommand({
        TableName: config.profileTable,
        Item: {
          pk: `USER#${data.targetUserId}`,
          sk: `NOTIFICATION#${now}#${notificationId}`,
          entityType: "NOTIFICATION",
          notificationId,
          category: "followers",
          type: "followers",
          title: "New follower",
          body: `${data.targetUsername} has a new FarmX follower.`,
          targetUrl: `/u/${data.targetUsername}`,
          actorId: actor.userId,
          createdAt: now,
          read: false,
        },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
    return { following: true };
  });

export const reportCommunityComment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    reportSchema.extend({ commentId: z.string().trim().min(1).max(128) }).parse(input),
  )
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireUser();
    const client = documentClient(config.region);
    const reportId = crypto.randomUUID();
    const now = new Date().toISOString();
    await client.send(
      new PutCommand({
        TableName: config.communityTable,
        Item: {
          pk: `REPORT#${reportId}`,
          sk: `REPORT#${reportId}`,
          gsi1pk: "REPORT#OPEN",
          gsi1sk: `${now}#${reportId}`,
          entityType: "COMMUNITY_COMMENT_REPORT",
          reportId,
          postId: data.postId,
          commentId: data.commentId,
          reporterId: actor.userId,
          reason: data.reason,
          details: data.details,
          status: "open",
          createdAt: now,
        },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
    return { reportId, status: "open" as const };
  });

export const reportCommunityPost = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => reportSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireUser();
    const client = documentClient(config.region);
    const reportId = crypto.randomUUID();
    const now = new Date().toISOString();
    await client.send(
      new PutCommand({
        TableName: config.communityTable,
        Item: {
          pk: `REPORT#${reportId}`,
          sk: `REPORT#${reportId}`,
          gsi1pk: "REPORT#OPEN",
          gsi1sk: `${now}#${reportId}`,
          entityType: "COMMUNITY_REPORT",
          reportId,
          postId: data.postId,
          reporterId: actor.userId,
          reason: data.reason,
          details: data.details,
          status: "open",
          createdAt: now,
        },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
    return { reportId, status: "open" as const };
  });

export const createCommunityMediaUpload = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => uploadKeySchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireUser();
    const key = `community/${actor.userId}/${Date.now()}-${crypto.randomUUID()}.${data.extension}`;
    return { objectKey: key, contentType: data.contentType, uploadRequired: true };
  });

export type {
  CommunityListingReference,
  CommunityLocation,
  CommunityMedia,
  CommunityReportReason,
  CreateCommunityCommentInput,
  CreateCommunityPostInput,
};
