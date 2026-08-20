import { getServerEnv } from "@/lib/server-env";
import { createServerFn } from "@tanstack/react-start";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { getAwsClientOptions } from "@/lib/aws-config";
import { requireAuthenticatedUser } from "@/lib/auth-server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const inventoryInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  quantity: z.number().min(0).max(1_000_000_000),
  unit: z.string().trim().min(1).max(40),
  category: z.string().trim().max(100),
  price: z.number().min(0).max(1_000_000_000).optional(),
  cost: z.number().min(0).max(1_000_000_000).optional(),
  lowStockThreshold: z.number().min(0).max(1_000_000_000).default(0),
  notes: z.string().trim().max(1000).optional(),
});
const inventoryIdSchema = z.object({ id: z.string().uuid() });
const fleetInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  type: z.string().trim().min(1).max(80),
  referenceNumber: z.string().trim().max(80),
  status: z.enum(["active", "idle", "maintenance", "inactive"]),
  driver: z.string().trim().max(120).optional(),
  location: z.string().trim().max(160),
  notes: z.string().trim().max(1000).optional(),
  lastServiceAt: z.string().optional(),
  nextServiceAt: z.string().optional(),
});
const fleetIdSchema = z.object({ id: z.string().uuid() });

function getConfig() {
  const region = process.env.AWS_REGION;
  const inventoryTable = getServerEnv("GOALL26_INVENTORY_TABLE", "FARMX_INVENTORY_TABLE");
  const fleetTable = getServerEnv("GOALL26_FLEET_TABLE", "FARMX_FLEET_TABLE");
  if (!region || !inventoryTable || !fleetTable) {
    throw new Error("Goall26 Inventory and Fleet AWS tables are not configured on the server.");
  }
  return { region, inventoryTable, fleetTable };
}

function db(region: string) {
  return DynamoDBDocumentClient.from(new DynamoDBClient(getAwsClientOptions(region)));
}

async function owner() {
  const actor = await requireAuthenticatedUser();
  return actor.userId;
}

export const listInventory = createServerFn({ method: "GET" }).handler(async () => {
  const config = getConfig();
  const ownerId = await owner();
  const response = await db(config.region).send(
    new QueryCommand({
      TableName: config.inventoryTable,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: { ":pk": `USER#${ownerId}`, ":prefix": "ITEM#" },
      ScanIndexForward: false,
    }),
  );
  return (response.Items ?? []).map(({ pk: _pk, sk: _sk, ownerId: _ownerId, ...item }) => item);
});

export const createInventory = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inventoryInputSchema.parse(input))
  .handler(async ({ data }) => {
    const config = getConfig();
    const ownerId = await owner();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const item = {
      ...data,
      id,
      ownerId,
      createdAt: now,
      updatedAt: now,
      lowStock: data.quantity <= data.lowStockThreshold,
    };
    await db(config.region).send(
      new PutCommand({
        TableName: config.inventoryTable,
        Item: { pk: `USER#${ownerId}`, sk: `ITEM#${id}`, entityType: "INVENTORY", ...item },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
    return item;
  });

export const updateInventory = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    inventoryIdSchema.extend(inventoryInputSchema.shape).parse(input),
  )
  .handler(async ({ data }) => {
    const config = getConfig();
    const ownerId = await owner();
    const now = new Date().toISOString();
    const item = {
      ...data,
      ownerId,
      updatedAt: now,
      lowStock: data.quantity <= data.lowStockThreshold,
    };
    await db(config.region).send(
      new PutCommand({
        TableName: config.inventoryTable,
        Item: { pk: `USER#${ownerId}`, sk: `ITEM#${data.id}`, entityType: "INVENTORY", ...item },
        ConditionExpression: "attribute_exists(pk) AND ownerId = :ownerId",
        ExpressionAttributeValues: { ":ownerId": ownerId },
      }),
    );
    return item;
  });

export const deleteInventory = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inventoryIdSchema.parse(input))
  .handler(async ({ data }) => {
    const config = getConfig();
    const ownerId = await owner();
    await db(config.region).send(
      new DeleteCommand({
        TableName: config.inventoryTable,
        Key: { pk: `USER#${ownerId}`, sk: `ITEM#${data.id}` },
        ConditionExpression: "attribute_exists(pk) AND ownerId = :ownerId",
        ExpressionAttributeValues: { ":ownerId": ownerId },
      }),
    );
    return { deleted: true };
  });

export const listFleet = createServerFn({ method: "GET" }).handler(async () => {
  const config = getConfig();
  const ownerId = await owner();
  const response = await db(config.region).send(
    new QueryCommand({
      TableName: config.fleetTable,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: { ":pk": `USER#${ownerId}`, ":prefix": "VEHICLE#" },
      ScanIndexForward: false,
    }),
  );
  return (response.Items ?? []).map(({ pk: _pk, sk: _sk, ownerId: _ownerId, ...item }) => item);
});

export const createFleetVehicle = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => fleetInputSchema.parse(input))
  .handler(async ({ data }) => {
    const config = getConfig();
    const ownerId = await owner();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const item = { ...data, id, ownerId, createdAt: now, updatedAt: now };
    await db(config.region).send(
      new PutCommand({
        TableName: config.fleetTable,
        Item: { pk: `USER#${ownerId}`, sk: `VEHICLE#${id}`, entityType: "VEHICLE", ...item },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
    return item;
  });

export const updateFleetVehicle = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => fleetIdSchema.extend(fleetInputSchema.shape).parse(input))
  .handler(async ({ data }) => {
    const config = getConfig();
    const ownerId = await owner();
    const now = new Date().toISOString();
    const item = { ...data, ownerId, updatedAt: now };
    await db(config.region).send(
      new PutCommand({
        TableName: config.fleetTable,
        Item: { pk: `USER#${ownerId}`, sk: `VEHICLE#${data.id}`, entityType: "VEHICLE", ...item },
        ConditionExpression: "attribute_exists(pk) AND ownerId = :ownerId",
        ExpressionAttributeValues: { ":ownerId": ownerId },
      }),
    );
    return item;
  });

export const deleteFleetVehicle = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => fleetIdSchema.parse(input))
  .handler(async ({ data }) => {
    const config = getConfig();
    const ownerId = await owner();
    await db(config.region).send(
      new DeleteCommand({
        TableName: config.fleetTable,
        Key: { pk: `USER#${ownerId}`, sk: `VEHICLE#${data.id}` },
        ConditionExpression: "attribute_exists(pk) AND ownerId = :ownerId",
        ExpressionAttributeValues: { ":ownerId": ownerId },
      }),
    );
    return { deleted: true };
  });
