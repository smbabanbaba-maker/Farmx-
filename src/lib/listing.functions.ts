import { createServerFn } from "@tanstack/react-start";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getAwsClientOptions } from "@/lib/aws-config";
import { getSubscriptionLimitForUser } from "./subscription.functions";
import { requireAuthenticatedUser } from "@/lib/auth-server";
import { z } from "zod";

const imageKeySchema = z.string();

const listingSchema = z.object({
  title: z.string().trim().min(5).max(100),
  category: z.string().trim().min(2).max(80),
  subcategory: z.string().trim().min(2).max(80),
  photos: z.array(imageKeySchema).min(1).max(10),
  videoLink: z.string().url().optional().or(z.literal("")),
  location: z.string().trim().min(2).max(100),
  description: z.string().trim().min(1).max(2000),
  price: z.number().nullable(),
  metadata: z.record(z.any()).optional(),
  promoDays: z.number().default(0),
});

export type ListingInput = z.infer<typeof listingSchema>;

function getListingsTable() {
  const tableName = process.env.FARMX_LISTINGS_TABLE;
  const region = process.env.AWS_REGION;

  if (!tableName || !region) {
    throw new Error(
      "AWS database is not configured. Set AWS_REGION and FARMX_LISTINGS_TABLE on the server.",
    );
  }

  return { tableName, region };
}

export const publishListing = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => listingSchema.parse(input))
  .handler(async ({ data }) => {
    const actor = await requireAuthenticatedUser();
    const { tableName, region } = getListingsTable();
    const now = new Date().toISOString();
    const listingId = crypto.randomUUID();
    const promoExpiresAt = data.promoDays
      ? new Date(Date.now() + data.promoDays * 86_400_000).toISOString()
      : undefined;

    const client = DynamoDBDocumentClient.from(new DynamoDBClient(getAwsClientOptions(region)), {
      marshallOptions: { removeUndefinedValues: true },
    });
    const listingLimit = await getSubscriptionLimitForUser(actor.userId);
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
        `Your current FarmX plan allows up to ${listingLimit} active listings. Upgrade your plan before publishing another listing.`,
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
          videoLink: data.videoLink || undefined,
          location: data.location,
          description: data.description,
          price: data.price,
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
