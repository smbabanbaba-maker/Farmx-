import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { getAwsClientOptions } from "@/lib/aws-config";
import { requireAuthenticatedUser } from "@/lib/auth-server";

const notificationSchema = z.object({
  id: z.string().min(1).max(180).optional(),
  eventId: z.string().min(1).max(180).optional(),
  type: z.string().min(1).max(64),
  category: z.string().min(1).max(64).optional(),
  title: z.string().min(1).max(180),
  body: z.string().min(1).max(1000),
  at: z.number().finite().optional(),
  read: z.boolean().optional(),
  targetUrl: z.string().max(500).optional(),
  conversationId: z.string().max(180).optional(),
  communityPostId: z.string().max(180).optional(),
});

const syncSchema = z.object({
  items: z.array(notificationSchema).max(100),
  channels: z.record(z.string(), z.boolean()).optional(),
});

const readSchema = z.object({ notificationId: z.string().min(1).max(180) });

function hasProductionConfig() {
  return Boolean(
    process.env.AWS_REGION &&
    process.env.FARMX_PROFILE_TABLE &&
    (process.env.COGNITO_USER_POOL_ID ?? process.env.VITE_COGNITO_USER_POOL_ID) &&
    (process.env.COGNITO_WEB_CLIENT_ID ?? process.env.VITE_COGNITO_WEB_CLIENT_ID),
  );
}

function getConfig() {
  const region = process.env.AWS_REGION;
  const profileTable = process.env.FARMX_PROFILE_TABLE;
  if (!region || !profileTable) throw new Error("Notification storage is not configured.");
  return { region, profileTable };
}

function client(region: string) {
  return DynamoDBDocumentClient.from(new DynamoDBClient(getAwsClientOptions(region)), {
    marshallOptions: { removeUndefinedValues: true },
  });
}

function noStore() {
  setResponseHeaders(new Headers({ "Cache-Control": "no-store", Vary: "Cookie, Authorization" }));
}

function mapItem(item: Record<string, unknown>) {
  const at = typeof item.at === "number" ? item.at : Date.parse(String(item.createdAt ?? ""));
  return {
    id: String(item.notificationId ?? item.eventId ?? item.id ?? item.sk),
    eventId: typeof item.eventId === "string" ? item.eventId : undefined,
    category: String(item.category ?? item.type ?? "system"),
    type: String(item.type ?? item.category ?? "system"),
    title: String(item.title ?? "FarmX update"),
    body: String(item.body ?? ""),
    at: Number.isFinite(at) ? at : Date.now(),
    read: item.read === true,
    targetUrl: typeof item.targetUrl === "string" ? item.targetUrl : undefined,
    conversationId: typeof item.conversationId === "string" ? item.conversationId : undefined,
    communityPostId: typeof item.communityPostId === "string" ? item.communityPostId : undefined,
  };
}

export const getMyNotifications = createServerFn({ method: "GET" }).handler(async () => {
  noStore();
  if (!hasProductionConfig()) return { items: [], channels: {} };
  const config = getConfig();
  const actor = await requireAuthenticatedUser();
  const result = await client(config.region).send(
    new QueryCommand({
      TableName: config.profileTable,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: { ":pk": `USER#${actor.userId}`, ":sk": "NOTIFICATION#" },
      ScanIndexForward: false,
      Limit: 100,
    }),
  );
  return { items: (result.Items ?? []).map(mapItem), channels: {} };
});

export const syncMyNotifications = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => syncSchema.parse(input))
  .handler(async ({ data }) => {
    noStore();
    if (!hasProductionConfig()) return { saved: false };
    const config = getConfig();
    const actor = await requireAuthenticatedUser();
    const dynamo = client(config.region);
    await Promise.all(
      data.items.map((item) => {
        const at = item.at ?? Date.now();
        const id = item.eventId ?? item.id ?? `${item.type}-${at}`;
        return dynamo.send(
          new PutCommand({
            TableName: config.profileTable,
            Item: {
              pk: `USER#${actor.userId}`,
              sk: `NOTIFICATION#${new Date(at).toISOString()}#${id}`,
              entityType: "NOTIFICATION",
              notificationId: id,
              eventId: item.eventId ?? id,
              category: item.category ?? item.type,
              type: item.type,
              title: item.title,
              body: item.body,
              at,
              read: item.read === true,
              targetUrl: item.targetUrl,
              conversationId: item.conversationId,
              communityPostId: item.communityPostId,
              createdAt: new Date(at).toISOString(),
            },
          }),
        );
      }),
    );
    return { saved: true };
  });

export const markMyNotificationRead = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => readSchema.parse(input))
  .handler(async ({ data }) => {
    noStore();
    if (!hasProductionConfig()) return { updated: false };
    const config = getConfig();
    const actor = await requireAuthenticatedUser();
    const dynamo = client(config.region);
    const result = await dynamo.send(
      new QueryCommand({
        TableName: config.profileTable,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
        FilterExpression: "notificationId = :id OR eventId = :id",
        ExpressionAttributeValues: {
          ":pk": `USER#${actor.userId}`,
          ":sk": "NOTIFICATION#",
          ":id": data.notificationId,
        },
        Limit: 5,
      }),
    );
    await Promise.all(
      (result.Items ?? []).map((item) =>
        dynamo.send(
          new UpdateCommand({
            TableName: config.profileTable,
            Key: { pk: item.pk, sk: item.sk },
            UpdateExpression: "SET #read = :read, readAt = :readAt",
            ExpressionAttributeNames: { "#read": "read" },
            ExpressionAttributeValues: { ":read": true, ":readAt": new Date().toISOString() },
          }),
        ),
      ),
    );
    return { updated: (result.Items ?? []).length > 0 };
  });
