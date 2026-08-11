import { createServerFn } from "@tanstack/react-start";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";

const imageKeySchema = z.string().regex(/^products\/[a-z0-9][a-z0-9._/-]*$/i);

const listingSchema = z.object({
  title: z.string().trim().min(10).max(70),
  category: z.string().trim().min(2).max(80),
  brand: z.string().trim().max(80).optional(),
  photos: z.array(imageKeySchema).min(1).max(5),
  videoLink: z.string().url().optional().or(z.literal("")),
  region: z.string().trim().min(2).max(80),
  type: z.string().trim().min(2).max(80),
  condition: z.string().trim().min(2).max(80),
  description: z.string().trim().min(1).max(850),
  price: z.number().positive(),
  bulkPrice: z.number().positive().optional(),
  negotiation: z.enum(["Yes", "No", "Not sure"]),
  delivery: z.array(z.string().trim().min(2).max(40)).min(1).max(4),
  contactName: z.string().trim().min(2).max(80),
  phone: z.string().regex(/^\d{7,15}$/),
  promoDays: z.union([z.literal(0), z.literal(7), z.literal(30)]),
  sellerId: z.string().trim().min(1).max(128).default("demo-user"),
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
    const { tableName, region } = getListingsTable();
    const now = new Date().toISOString();
    const listingId = crypto.randomUUID();
    const promoExpiresAt = data.promoDays
      ? new Date(Date.now() + data.promoDays * 86_400_000).toISOString()
      : undefined;

    const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
      marshallOptions: { removeUndefinedValues: true },
    });

    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          pk: `LISTING#${listingId}`,
          sk: `LISTING#${listingId}`,
          entityType: "LISTING",
          listingId,
          ownerId: data.sellerId,
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
          title: data.title,
          category: data.category,
          brand: data.brand || undefined,
          imageKeys: data.photos,
          videoLink: data.videoLink || undefined,
          region: data.region,
          productType: data.type,
          condition: data.condition,
          description: data.description,
          price: data.price,
          bulkPrice: data.bulkPrice,
          negotiation: data.negotiation,
          delivery: data.delivery,
          contactName: data.contactName,
          phone: data.phone,
          promoDays: data.promoDays,
          promoExpiresAt,
          gsi1pk: `LISTING_STATUS#ACTIVE`,
          gsi1sk: `${now}#${listingId}`,
          gsi2pk: `SELLER#${data.sellerId}`,
          gsi2sk: `${now}#${listingId}`,
        },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );

    return { listingId, createdAt: now };
  });
