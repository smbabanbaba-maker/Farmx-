import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeaders } from "@tanstack/react-start/server";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { getAwsClientOptions } from "@/lib/aws-config";

const roles = ["farmer", "seller", "buyer", "employer", "agricultural_business"] as const;
const profileLanguageSchema = z.enum(["en", "ha", "ig", "yo", "kr"]);

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9_]{3,24}$/,
      "Username must use 3–24 lowercase letters, numbers, or underscores.",
    ),
  role: z.enum(roles),
  bio: z.string().trim().max(280),
  state: z.string().trim().min(2).max(80),
  location: z.string().trim().max(120),
  phone: z.string().trim().min(7).max(20),
  email: z.string().email().max(120),
  agriculturalInterests: z.array(z.string().trim().min(2).max(40)).max(10),
  skills: z.array(z.string().trim().min(2).max(40)).max(10),
  preferredLanguage: profileLanguageSchema.optional(),
  photoKey: z
    .string()
    .regex(/^profiles\/[a-z0-9-]+\/avatar\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i)
    .optional(),
  privacy: z.object({
    profileVisibility: z.enum(["public", "farmx_members", "private"]),
    messagePermission: z.enum(["everyone", "farmx_members", "followers"]),
    callPermission: z.enum(["everyone", "farmx_members", "nobody"]),
    showFollowers: z.boolean(),
    showActivity: z.boolean(),
    showBusinessInfo: z.boolean(),
  }),
});

const photoInputSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

const usernameInputSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,24}$/),
});

const listingStatusSchema = z.enum(["ACTIVE", "PAUSED", "SOLD", "UNAVAILABLE", "CLOSED"]);
const listingActionSchema = z.object({
  listingId: z.string().uuid(),
  status: listingStatusSchema,
});
const listingIdSchema = z.object({ listingId: z.string().uuid() });

export type FarmXProfile = z.infer<typeof profileSchema> & {
  userId: string;
  createdAt: string;
  updatedAt: string;
  verification: "not_started" | "pending" | "approved" | "rejected" | "more_information";
};

export type ProfileStats = {
  activeAds: number;
  totalAds: number;
  totalAdViews: number;
  buyerInquiries: number | null;
  savedAds: number | null;
  followers: number | null;
  following: number | null;
  rating: number | null;
  reviews: number | null;
};

function hasProfileProductionConfig() {
  return Boolean(
    process.env.AWS_REGION &&
    process.env.FARMX_PROFILE_TABLE &&
    process.env.FARMX_LISTINGS_TABLE &&
    process.env.FARMX_MEDIA_BUCKET &&
    (process.env.COGNITO_USER_POOL_ID ?? process.env.VITE_COGNITO_USER_POOL_ID) &&
    (process.env.COGNITO_WEB_CLIENT_ID ?? process.env.VITE_COGNITO_WEB_CLIENT_ID),
  );
}

export const getProfileRuntimeMode = createServerFn({ method: "GET" }).handler(async () => ({
  mode: hasProfileProductionConfig() ? ("production" as const) : ("preview" as const),
}));

function getConfig() {
  const region = process.env.AWS_REGION;
  const profileTable = process.env.FARMX_PROFILE_TABLE;
  const listingsTable = process.env.FARMX_LISTINGS_TABLE;
  const bucket = process.env.FARMX_MEDIA_BUCKET;
  const userPoolId = process.env.COGNITO_USER_POOL_ID ?? process.env.VITE_COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_WEB_CLIENT_ID ?? process.env.VITE_COGNITO_WEB_CLIENT_ID;

  if (!region || !profileTable || !listingsTable || !bucket || !userPoolId || !clientId) {
    throw new Error(
      "Profile service is not configured. Set AWS_REGION, FARMX_PROFILE_TABLE, FARMX_LISTINGS_TABLE, FARMX_MEDIA_BUCKET, COGNITO_USER_POOL_ID, and COGNITO_WEB_CLIENT_ID on the FarmX server.",
    );
  }

  return { region, profileTable, listingsTable, bucket, userPoolId, clientId };
}

async function requireAuthenticatedUser() {
  const authorization = getRequestHeader("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("You must be signed in to use Profile.");
  }

  const { userPoolId, clientId } = getConfig();
  const token = authorization.slice("Bearer ".length);
  const verifier = CognitoJwtVerifier.create({
    userPoolId,
    tokenUse: "id",
    clientId,
  });
  const claims = await verifier.verify(token);
  if (!claims.sub) throw new Error("Your FarmX account identity could not be verified.");

  return { userId: claims.sub, email: typeof claims.email === "string" ? claims.email : undefined };
}

function createDocumentClient(region: string) {
  return DynamoDBDocumentClient.from(new DynamoDBClient(getAwsClientOptions(region)), {
    marshallOptions: { removeUndefinedValues: true },
  });
}

function privateResponse() {
  setResponseHeaders(
    new Headers({
      "Cache-Control": "no-store",
      Vary: "Cookie, Authorization",
    }),
  );
}

export const getMyAds = createServerFn({ method: "GET" }).handler(async () => {
  privateResponse();
  const config = getConfig();
  const actor = await requireAuthenticatedUser();
  const client = createDocumentClient(config.region);
  const result = await client.send(
    new QueryCommand({
      TableName: config.listingsTable,
      IndexName: "GSI2",
      KeyConditionExpression: "gsi2pk = :owner",
      ExpressionAttributeValues: { ":owner": `SELLER#${actor.userId}` },
      ScanIndexForward: false,
    }),
  );

  return (result.Items ?? []).map((listing) => ({
    listingId: String(listing.listingId),
    title: String(listing.title),
    price: Number(listing.price),
    region: String(listing.region),
    status: String(listing.status),
    createdAt: String(listing.createdAt),
    updatedAt: String(listing.updatedAt),
    imageKeys: Array.isArray(listing.imageKeys) ? listing.imageKeys.map(String) : [],
    viewCount: Number(listing.viewCount ?? 0),
    savedCount: Number(listing.savedCount ?? 0),
    inquiryCount: Number(listing.inquiryCount ?? 0),
    promoExpiresAt: typeof listing.promoExpiresAt === "string" ? listing.promoExpiresAt : null,
  }));
});

export const updateMyAdStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => listingActionSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireAuthenticatedUser();
    const updatedAt = new Date().toISOString();
    const client = createDocumentClient(config.region);
    await client.send(
      new UpdateCommand({
        TableName: config.listingsTable,
        Key: { pk: `LISTING#${data.listingId}`, sk: `LISTING#${data.listingId}` },
        ConditionExpression: "ownerId = :ownerId",
        UpdateExpression:
          "SET #status = :status, gsi1pk = :gsi1pk, gsi1sk = :gsi1sk, updatedAt = :updatedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":ownerId": actor.userId,
          ":status": data.status,
          ":gsi1pk": `LISTING_STATUS#${data.status}`,
          ":gsi1sk": `${updatedAt}#${data.listingId}`,
          ":updatedAt": updatedAt,
        },
      }),
    );
    return { listingId: data.listingId, status: data.status, updatedAt };
  });

export const deleteMyAd = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => listingIdSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireAuthenticatedUser();
    await createDocumentClient(config.region).send(
      new DeleteCommand({
        TableName: config.listingsTable,
        Key: { pk: `LISTING#${data.listingId}`, sk: `LISTING#${data.listingId}` },
        ConditionExpression: "ownerId = :ownerId",
        ExpressionAttributeValues: { ":ownerId": actor.userId },
      }),
    );
    return { deleted: true, listingId: data.listingId };
  });

export const getPublicProfile = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => usernameInputSchema.parse(input))
  .handler(async ({ data }) => {
    const config = getConfig();
    const client = createDocumentClient(config.region);
    const profileResult = await client.send(
      new QueryCommand({
        TableName: config.profileTable,
        IndexName: "GSI1",
        KeyConditionExpression: "gsi1pk = :username",
        ExpressionAttributeValues: { ":username": `USERNAME#${data.username}` },
        Limit: 1,
      }),
    );
    const profile = profileResult.Items?.[0] as FarmXProfile | undefined;
    if (!profile || profile.privacy.profileVisibility !== "public") {
      throw new Error("This FarmX profile is unavailable.");
    }

    const [listingResult, followerResult] = await Promise.all([
      client.send(
        new QueryCommand({
          TableName: config.listingsTable,
          IndexName: "GSI2",
          KeyConditionExpression: "gsi2pk = :owner",
          ExpressionAttributeValues: { ":owner": `SELLER#${profile.userId}` },
        }),
      ),
      client.send(
        new QueryCommand({
          TableName: config.profileTable,
          IndexName: "GSI1",
          KeyConditionExpression: "gsi1pk = :followers",
          ExpressionAttributeValues: { ":followers": `PROFILE_FOLLOWERS#${profile.userId}` },
          Select: "COUNT",
        }),
      ),
    ]);
    const listings = listingResult.Items ?? [];
    const activeAds = listings.filter((listing) => listing.status === "ACTIVE").length;
    return {
      profile: {
        fullName: profile.fullName,
        username: profile.username,
        role: profile.role,
        bio: profile.bio,
        state: profile.state,
        location: profile.location,
        agriculturalInterests: profile.agriculturalInterests,
        photoKey: profile.photoKey,
        verification: profile.verification,
      },
      stats: {
        activeAds,
        followers: followerResult.Count ?? 0,
        rating: null,
        reviews: null,
      },
    };
  });

export const getPublicProfilePhotoUrl = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => usernameInputSchema.parse(input))
  .handler(async ({ data }) => {
    const config = getConfig();
    const client = createDocumentClient(config.region);
    const profileResult = await client.send(
      new QueryCommand({
        TableName: config.profileTable,
        IndexName: "GSI1",
        KeyConditionExpression: "gsi1pk = :username",
        ExpressionAttributeValues: { ":username": `USERNAME#${data.username}` },
        Limit: 1,
      }),
    );
    const profile = profileResult.Items?.[0] as FarmXProfile | undefined;
    if (!profile?.photoKey || profile.privacy.profileVisibility !== "public") {
      return { downloadUrl: null };
    }

    const downloadUrl = await getSignedUrl(
      new S3Client(getAwsClientOptions(config.region)),
      new GetObjectCommand({ Bucket: config.bucket, Key: profile.photoKey }),
      { expiresIn: 300 },
    );
    return { downloadUrl };
  });

export const getMyProfile = createServerFn({ method: "GET" }).handler(async () => {
  privateResponse();
  const config = getConfig();
  const actor = await requireAuthenticatedUser();
  const client = createDocumentClient(config.region);

  const [profileResult, listingResult, followerResult, followingResult] = await Promise.all([
    client.send(
      new GetCommand({
        TableName: config.profileTable,
        Key: { pk: `USER#${actor.userId}`, sk: "PROFILE" },
      }),
    ),
    client.send(
      new QueryCommand({
        TableName: config.listingsTable,
        IndexName: "GSI2",
        KeyConditionExpression: "gsi2pk = :owner",
        ExpressionAttributeValues: { ":owner": `SELLER#${actor.userId}` },
      }),
    ),
    client.send(
      new QueryCommand({
        TableName: config.profileTable,
        IndexName: "GSI1",
        KeyConditionExpression: "gsi1pk = :followers",
        ExpressionAttributeValues: { ":followers": `PROFILE_FOLLOWERS#${actor.userId}` },
        Select: "COUNT",
      }),
    ),
    client.send(
      new QueryCommand({
        TableName: config.profileTable,
        KeyConditionExpression: "pk = :user AND begins_with(sk, :following)",
        ExpressionAttributeValues: { ":user": `USER#${actor.userId}`, ":following": "FOLLOWING#" },
        Select: "COUNT",
      }),
    ),
  ]);

  const listings = listingResult.Items ?? [];
  const activeListings = listings.filter((listing) => listing.status === "ACTIVE");
  let profile = (profileResult.Item as FarmXProfile | undefined) ?? null;

  if (!profile) {
    const now = new Date().toISOString();
    const cleanId = actor.userId.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase();
    const defaultUsername = `farmer_${cleanId || "user"}`;
    const defaultProfile = {
      userId: actor.userId,
      fullName: actor.email ? actor.email.split("@")[0] : "FarmX Member",
      username: defaultUsername,
      role: "farmer" as const,
      bio: "Member of the FarmX agricultural marketplace.",
      state: "Kano State",
      location: "Kano Municipal",
      phone: "+2348000000000",
      email: actor.email ?? `${defaultUsername}@farmx.app`,
      agriculturalInterests: ["Crop Farming", "Agribusiness"],
      skills: ["General Farming"],
      privacy: {
        profileVisibility: "public" as const,
        messagePermission: "everyone" as const,
        callPermission: "everyone" as const,
        showFollowers: true,
        showActivity: true,
        showBusinessInfo: true,
      },
      createdAt: now,
      updatedAt: now,
      verification: "not_started" as const,
      pk: `USER#${actor.userId}`,
      sk: "PROFILE",
      entityType: "PROFILE",
      gsi1pk: `USERNAME#${defaultUsername}`,
      gsi1sk: `USER#${actor.userId}`,
    };

    try {
      await client.send(
        new PutCommand({
          TableName: config.profileTable,
          Item: defaultProfile,
          ConditionExpression: "attribute_not_exists(pk)",
        }),
      );
      profile = defaultProfile;
    } catch {
      const retryResult = await client.send(
        new GetCommand({
          TableName: config.profileTable,
          Key: { pk: `USER#${actor.userId}`, sk: "PROFILE" },
        }),
      );
      profile = (retryResult.Item as FarmXProfile | undefined) ?? defaultProfile;
    }
  }

  const stats: ProfileStats = {
    activeAds: activeListings.length,
    totalAds: listings.length,
    totalAdViews: listings.reduce((total, listing) => total + Number(listing.viewCount ?? 0), 0),
    buyerInquiries: null,
    savedAds: null,
    followers: followerResult.Count ?? 0,
    following: followingResult.Count ?? 0,
    rating: null,
    reviews: null,
  };

  return { profile, stats, profileExists: !!profile };
});

export const saveMyProfile = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => profileSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireAuthenticatedUser();
    const client = createDocumentClient(config.region);
    const now = new Date().toISOString();
    const [existing, matchingUsername] = await Promise.all([
      client.send(
        new GetCommand({
          TableName: config.profileTable,
          Key: { pk: `USER#${actor.userId}`, sk: "PROFILE" },
        }),
      ),
      client.send(
        new QueryCommand({
          TableName: config.profileTable,
          IndexName: "GSI1",
          KeyConditionExpression: "gsi1pk = :username",
          ExpressionAttributeValues: { ":username": `USERNAME#${data.username}` },
          Limit: 1,
        }),
      ),
    ]);
    const previous = existing.Item as FarmXProfile | undefined;
    const usernameOwner = matchingUsername.Items?.[0]?.userId;
    if (usernameOwner && usernameOwner !== actor.userId) {
      throw new Error("That FarmX username is already in use.");
    }

    const item: FarmXProfile & {
      pk: string;
      sk: string;
      entityType: string;
      gsi1pk: string;
      gsi1sk: string;
    } = {
      ...data,
      userId: actor.userId,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
      verification: previous?.verification ?? "not_started",
      pk: `USER#${actor.userId}`,
      sk: "PROFILE",
      entityType: "PROFILE",
      gsi1pk: `USERNAME#${data.username}`,
      gsi1sk: `USER#${actor.userId}`,
    };

    await client.send(
      new PutCommand({
        TableName: config.profileTable,
        Item: item,
        ConditionExpression: "attribute_not_exists(pk) OR userId = :userId",
        ExpressionAttributeValues: { ":userId": actor.userId },
      }),
    );

    return { profile: item };
  });

export const saveMyLanguagePreference = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ preferredLanguage: profileLanguageSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireAuthenticatedUser();
    const client = createDocumentClient(config.region);
    await client.send(
      new UpdateCommand({
        TableName: config.profileTable,
        Key: { pk: `USER#${actor.userId}`, sk: "PROFILE" },
        UpdateExpression: "SET preferredLanguage = :preferredLanguage, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":preferredLanguage": data.preferredLanguage,
          ":updatedAt": new Date().toISOString(),
        },
        ConditionExpression: "attribute_exists(pk)",
      }),
    );
    return { preferredLanguage: data.preferredLanguage };
  });

export const createProfilePhotoUpload = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => photoInputSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireAuthenticatedUser();
    const extension =
      data.contentType === "image/png" ? "png" : data.contentType === "image/webp" ? "webp" : "jpg";
    const objectKey = `profiles/${actor.userId}/avatar/${crypto.randomUUID()}.${extension}`;
    const client = new S3Client(getAwsClientOptions(config.region));
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
        ContentType: data.contentType,
        ServerSideEncryption: "AES256",
      }),
      { expiresIn: 300, signableHeaders: new Set(["content-type"]) },
    );

    return { objectKey, uploadUrl, expiresIn: 300 };
  });

export const removeMyProfilePhoto = createServerFn({ method: "POST" }).handler(async () => {
  privateResponse();
  const config = getConfig();
  const actor = await requireAuthenticatedUser();
  const client = createDocumentClient(config.region);
  const existing = await client.send(
    new GetCommand({
      TableName: config.profileTable,
      Key: { pk: `USER#${actor.userId}`, sk: "PROFILE" },
    }),
  );
  const profile = existing.Item as (FarmXProfile & { pk: string; sk: string }) | undefined;
  if (!profile?.photoKey) return { removed: false };

  const { photoKey, ...withoutPhoto } = profile;
  await client.send(
    new PutCommand({
      TableName: config.profileTable,
      Item: { ...withoutPhoto, updatedAt: new Date().toISOString() },
      ConditionExpression: "userId = :userId",
      ExpressionAttributeValues: { ":userId": actor.userId },
    }),
  );
  await new S3Client(getAwsClientOptions(config.region)).send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: photoKey }),
  );
  return { removed: true };
});

export const getMyProfilePhotoUrl = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        objectKey: z
          .string()
          .regex(/^profiles\/[a-z0-9-]+\/avatar\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireAuthenticatedUser();
    if (!data.objectKey.startsWith(`profiles/${actor.userId}/`))
      throw new Error("You cannot access this profile photo.");

    const client = new S3Client(getAwsClientOptions(config.region));
    const downloadUrl = await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: config.bucket, Key: data.objectKey }),
      { expiresIn: 300 },
    );
    return { downloadUrl, expiresIn: 300 };
  });
