import { createServerFn } from "@tanstack/react-start";
import { setResponseHeaders } from "@tanstack/react-start/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { getAwsClientOptions } from "@/lib/aws-config";
import { requireAuthenticatedUser } from "@/lib/auth-server";

const conversationSchema = z.object({
  id: z.string().min(1).max(160),
  updatedAt: z.number().finite(),
});

const reportSchema = z.object({
  id: z.string().min(1).max(160),
  createdAt: z.number().finite(),
  updatedAt: z.number().finite(),
});

const syncSchema = z.object({
  conversations: z.array(z.unknown()).max(100),
  reports: z.array(z.unknown()).max(500),
});

const deleteSchema = z.object({ conversationId: z.string().min(1).max(160) });

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
  if (!region || !profileTable) {
    throw new Error("Messaging service is not configured on the Goall26 server.");
  }
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

export const getMyMessages = createServerFn({ method: "GET" }).handler(async () => {
  noStore();
  if (!hasProductionConfig()) return { conversations: [], reports: [], typing: {} };
  const config = getConfig();
  const actor = await requireAuthenticatedUser();
  const dynamo = client(config.region);
  const [conversationResult, reportResult] = await Promise.all([
    dynamo.send(
      new QueryCommand({
        TableName: config.profileTable,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
        ExpressionAttributeValues: {
          ":pk": `USER#${actor.userId}`,
          ":sk": "CONVERSATION#",
        },
        ScanIndexForward: false,
        Limit: 100,
      }),
    ),
    dynamo.send(
      new QueryCommand({
        TableName: config.profileTable,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
        ExpressionAttributeValues: {
          ":pk": `USER#${actor.userId}`,
          ":sk": "MESSAGE_REPORT#",
        },
        ScanIndexForward: false,
        Limit: 500,
      }),
    ),
  ]);
  return {
    conversations: (conversationResult.Items ?? [])
      .map((item) => item.conversation)
      .filter(Boolean),
    reports: (reportResult.Items ?? []).map((item) => item.report).filter(Boolean),
    typing: {},
  };
});

export const syncMyMessages = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => syncSchema.parse(input))
  .handler(async ({ data }) => {
    noStore();
    if (!hasProductionConfig()) return { saved: false };
    const config = getConfig();
    const actor = await requireAuthenticatedUser();
    const dynamo = client(config.region);
    const now = new Date().toISOString();
    const conversations = data.conversations.filter((item): item is Record<string, unknown> => {
      const parsed = conversationSchema.safeParse(item);
      return parsed.success;
    });
    const reports = data.reports.filter((item): item is Record<string, unknown> => {
      const parsed = reportSchema.safeParse(item);
      return parsed.success;
    });

    await Promise.all([
      ...conversations.map((conversation) =>
        dynamo.send(
          new PutCommand({
            TableName: config.profileTable,
            Item: {
              pk: `USER#${actor.userId}`,
              sk: `CONVERSATION#${String(conversation.id)}`,
              entityType: "CONVERSATION",
              conversation,
              updatedAt: now,
            },
          }),
        ),
      ),
      ...reports.map((report) =>
        dynamo.send(
          new PutCommand({
            TableName: config.profileTable,
            Item: {
              pk: `USER#${actor.userId}`,
              sk: `MESSAGE_REPORT#${String(report.id)}`,
              entityType: "MESSAGE_REPORT",
              report,
              updatedAt: now,
            },
          }),
        ),
      ),
    ]);
    return { saved: true, conversationCount: conversations.length, reportCount: reports.length };
  });

export const deleteMyConversation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deleteSchema.parse(input))
  .handler(async ({ data }) => {
    noStore();
    if (!hasProductionConfig()) return { deleted: false };
    const config = getConfig();
    const actor = await requireAuthenticatedUser();
    await client(config.region).send(
      new DeleteCommand({
        TableName: config.profileTable,
        Key: { pk: `USER#${actor.userId}`, sk: `CONVERSATION#${data.conversationId}` },
      }),
    );
    return { deleted: true };
  });
