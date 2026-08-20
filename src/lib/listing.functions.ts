import { getServerEnv } from "@/lib/server-env";
import { createServerFn } from "@tanstack/react-start";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getAwsClientOptions } from "@/lib/aws-config";
import { MAX_LISTING_PHOTOS } from "@/lib/listing-media";
import { getSubscriptionLimitForUser } from "./subscription.functions";
import { requireAuthenticatedUser } from "@/lib/auth-server";
import { z } from "zod";

const imageKeySchema = z.string().trim().min(1).max(300);

const listingSchema = z.object({
  title: z.string().trim().min(5).max(100),
  category: z.string().trim().min(2).max(80),
  subcategory: z.string().trim().min(2).max(80),
  photos: z.array(imageKeySchema).min(1).max(MAX_LISTING_PHOTOS),
  videoLink: z.string().url().optional().or(z.literal("")),
  location: z.string().trim().min(2).max(100),
  description: z.string().trim().min(1).max(2000),
  price: z.number().nullable(),
  metadata: z.record(z.any()).optional(),
  promoDays: z.number().int().min(0).max(30).default(0),
});

export type ListingInput = z.infer<typeof listingSchema>;

function getListingsTable() {
  const tableName = getServerEnv("GOALL26_LISTINGS_TABLE", "FARMX_LISTINGS_TABLE");
  const region = process.env.AWS_REGION;
  const mediaBucket = getServerEnv("GOALL26_MEDIA_BUCKET", "FARMX_MEDIA_BUCKET");
  const profileTable = getServerEnv("GOALL26_PROFILE_TABLE", "FARMX_PROFILE_TABLE");

  if (!tableName || !region || !mediaBucket || !profileTable) {
    throw new Error(
      "AWS listing services are not configured. Set AWS_REGION, GOALL26_LISTINGS_TABLE, GOALL26_PROFILE_TABLE, and GOALL26_MEDIA_BUCKET on the server.",
    );
  }

  return { tableName, region, mediaBucket, profileTable };
}

export const publishListing = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => listingSchema.parse(input))
  .handler(async ({ data }) => {
    const actor = await requireAuthenticatedUser();
    const { tableName, region, mediaBucket, profileTable } = getListingsTable();
    const now = new Date().toISOString();
    const listingId = crypto.randomUUID();
    const safeUserId = actor.userId.replace(/[^a-zA-Z0-9_-]/g, "-");
    const expectedPrefix = `listings/${safeUserId}/`;
    if (
      data.photos.some(
        (key) => !key.startsWith(expectedPrefix) || key.includes("..") || key.includes("//"),
      )
    ) {
      throw new Error("One or more listing photos are not owned by this account.");
    }
    const promoExpiresAt = data.promoDays
      ? new Date(Date.now() + data.promoDays * 86_400_000).toISOString()
      : undefined;

    const client = DynamoDBDocumentClient.from(new DynamoDBClient(getAwsClientOptions(region)), {
      marshallOptions: { removeUndefinedValues: true },
    });
    const [profileResult, listingLimit] = await Promise.all([
      client.send(
        new GetCommand({
          TableName: profileTable,
          Key: { pk: `USER#${actor.userId}`, sk: "PROFILE" },
        }),
      ),
      getSubscriptionLimitForUser(actor.userId),
    ]);
    const profile = (profileResult.Item ?? {}) as Record<string, unknown>;
    const sellerName = String(
      profile.fullName ?? actor.name ?? actor.email?.split("@")[0] ?? "Goall26 Member",
    );
    const sellerUsername = typeof profile.username === "string" ? profile.username : undefined;
    const sellerPhotoKey = typeof profile.photoKey === "string" ? profile.photoKey : undefined;
    const sellerPhone = typeof profile.phone === "string" ? profile.phone : undefined;
    const sellerEmail = typeof profile.email === "string" ? profile.email : actor.email;
    const sellerState = typeof profile.state === "string" ? profile.state : undefined;
    const sellerLocation = typeof profile.location === "string" ? profile.location : undefined;

    await Promise.all(
      data.photos.map(async (objectKey) => {
        const object = await new S3Client(getAwsClientOptions(region)).send(
          new HeadObjectCommand({ Bucket: mediaBucket, Key: objectKey }),
        );
        if (!object.ContentType?.startsWith("image/")) {
          throw new Error("One or more listing photos are not valid image objects.");
        }
      }),
    );

    const listingCount = await client.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: "GSI2",
        KeyConditionExpression: "gsi2pk = :seller",
        FilterExpression: "#status = :active",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":seller": `SELLER#${actor.userId}`, ":active": "ACTIVE" },
        Select: "COUNT",
      }),
    );
    if (Number(listingCount.Count ?? 0) >= listingLimit) {
      throw new Error(
        `Your current Goall26 plan allows up to ${listingLimit} active listings. Upgrade your plan before publishing another listing.`,
      );
    }

    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          pk: `LISTING#${listingId}`,
          sk: `LISTING#${listingId}`,
          entityType: "LISTING",
          listingId,
          ownerId: actor.userId,
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
          title: data.title,
          category: data.category,
          subcategory: data.subcategory,
          imageKeys: data.photos,
          imageCount: data.photos.length,
          videoLink: data.videoLink || undefined,
          location: data.location,
          description: data.description,
          price: data.price,
          sellerName,
          sellerUsername,
          sellerPhotoKey,
          sellerPhone,
          sellerEmail,
          sellerState,
          sellerLocation,
          metadata: data.metadata,
          promoDays: data.promoDays,
          promoExpiresAt,
          gsi1pk: `LISTING_STATUS#ACTIVE`,
          gsi1sk: `${now}#${listingId}`,
          gsi2pk: `SELLER#${actor.userId}`,
          gsi2sk: `${now}#${listingId}`,
        },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );

    return { listingId, createdAt: now };
  });
