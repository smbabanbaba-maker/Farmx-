import { createHmac, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeaders } from "@tanstack/react-start/server";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { getPaystackSecret } from "./paystack-server";
import { SUBSCRIPTION_PLANS } from "./subscription-repository";
import type { SubscriptionStatus, SubscriptionTier, UserSubscription } from "./subscription.types";
import { writeWalletNotification } from "./wallet.functions";

const paymentMethods = ["card", "bank_transfer", "ussd", "wallet"] as const;

const paymentSchema = z.object({
  tier: z.enum(["STARTER", "BASIC", "PREMIUM", "VIP", "BUSINESS", "DIAMOND", "ENTERPRISE"]),
  paymentMethod: z.enum(paymentMethods),
});

const referenceSchema = z.object({ reference: z.string().trim().min(1).max(128) });
const autoRenewSchema = z.object({ enabled: z.boolean() });
const webhookSchema = z.object({
  event: z.string().trim().min(1).max(128),
  data: z.object({
    reference: z.string().trim().min(1).max(128),
    status: z.string().trim().min(1).max(64),
    amount: z.number().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

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
  const listingsTable = process.env.FARMX_LISTINGS_TABLE;
  const userPoolId = process.env.COGNITO_USER_POOL_ID ?? process.env.VITE_COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_WEB_CLIENT_ID ?? process.env.VITE_COGNITO_WEB_CLIENT_ID;
  if (!region || !profileTable || !userPoolId || !clientId) {
    throw new Error("FarmX subscription storage is not configured on the server.");
  }
  return { region, profileTable, listingsTable, userPoolId, clientId };
}

function documentClient(region: string) {
  return DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
    marshallOptions: { removeUndefinedValues: true },
  });
}

function noStore() {
  setResponseHeaders(new Headers({ "Cache-Control": "no-store", Vary: "Cookie, Authorization" }));
}

async function requireUser() {
  const authorization = getRequestHeader("authorization");
  if (!authorization?.startsWith("Bearer "))
    throw new Error("You must be signed in to manage a subscription.");
  const { userPoolId, clientId } = getConfig();
  const claims = await CognitoJwtVerifier.create({ userPoolId, tokenUse: "id", clientId }).verify(
    authorization.slice("Bearer ".length),
  );
  if (!claims.sub) throw new Error("Your FarmX account identity could not be verified.");
  return { userId: claims.sub, email: typeof claims.email === "string" ? claims.email : undefined };
}

function freeSubscription(userId: string): UserSubscription {
  const now = new Date().toISOString();
  return {
    userId,
    tier: "FREE",
    status: "FREE",
    startDate: now,
    renewalDate: now,
    remainingDays: 0,
    autoRenew: false,
  };
}

function subscriptionFromItem(userId: string, item?: Record<string, unknown>): UserSubscription {
  if (!item || typeof item.tier !== "string") return freeSubscription(userId);
  const renewalDate =
    typeof item.renewalDate === "string" ? item.renewalDate : new Date().toISOString();
  const remainingDays = Math.max(
    0,
    Math.ceil((new Date(renewalDate).getTime() - Date.now()) / 86_400_000),
  );
  return {
    userId,
    tier: item.tier as SubscriptionTier,
    status: (item.status as SubscriptionStatus) ?? "FREE",
    startDate: typeof item.startDate === "string" ? item.startDate : new Date().toISOString(),
    renewalDate,
    remainingDays,
    autoRenew: item.autoRenew === true,
    reference: typeof item.reference === "string" ? item.reference : undefined,
  };
}

async function getSubscriptionForUser(
  userId: string,
  client: DynamoDBDocumentClient,
  profileTable: string,
  listingsTable?: string,
): Promise<UserSubscription> {
  const result = await client.send(
    new GetCommand({ TableName: profileTable, Key: { pk: `USER#${userId}`, sk: "SUBSCRIPTION" } }),
  );
  const subscription = subscriptionFromItem(
    userId,
    result.Item as Record<string, unknown> | undefined,
  );
  if (
    subscription.status === "ACTIVE" &&
    new Date(subscription.renewalDate).getTime() <= Date.now()
  ) {
    const now = new Date().toISOString();
    await client.send(
      new UpdateCommand({
        TableName: profileTable,
        Key: { pk: `USER#${userId}`, sk: "SUBSCRIPTION" },
        UpdateExpression:
          "SET #tier = :tier, #status = :status, autoRenew = :autoRenew, remainingDays = :remainingDays, expiredAt = :expiredAt",
        ExpressionAttributeNames: { "#tier": "tier", "#status": "status" },
        ExpressionAttributeValues: {
          ":tier": "FREE",
          ":status": "FREE",
          ":autoRenew": false,
          ":remainingDays": 0,
          ":expiredAt": now,
        },
      }),
    );
    return freeSubscription(userId);
  }
  const listingLimit = getPlan(subscription.tier)?.maxListings ?? SUBSCRIPTION_PLANS[0].maxListings;
  if (!listingsTable) return { ...subscription, listingLimit };
  const listingCount = await client.send(
    new QueryCommand({
      TableName: listingsTable,
      IndexName: "GSI2",
      KeyConditionExpression: "gsi2pk = :seller",
      FilterExpression: "#status = :active",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":seller": `SELLER#${userId}`, ":active": "ACTIVE" },
      Select: "COUNT",
    }),
  );
  const activeListings = Number(listingCount.Count ?? 0);
  return {
    ...subscription,
    activeListings,
    listingLimit,
    overLimit: activeListings > listingLimit,
  };
}

function getPlan(tier: SubscriptionTier) {
  return SUBSCRIPTION_PLANS.find((plan) => plan.tier === tier);
}

function createReference() {
  return `SUB-${Math.random().toString(36).slice(2, 8).toUpperCase()}${Date.now().toString().slice(-6)}`;
}

function makeSubscriptionItem(
  userId: string,
  tier: SubscriptionTier,
  reference: string,
  now: string,
) {
  const renewalDate = new Date(Date.now() + 30 * 86_400_000).toISOString();
  return {
    pk: `USER#${userId}`,
    sk: "SUBSCRIPTION",
    entityType: "SUBSCRIPTION",
    userId,
    tier,
    status: "ACTIVE",
    startDate: now,
    renewalDate,
    remainingDays: 30,
    autoRenew: true,
    reference,
    updatedAt: now,
  };
}

export const getSubscriptionSummary = createServerFn({ method: "GET" }).handler(async () => {
  noStore();
  if (!hasProductionConfig()) return freeSubscription("preview-user");
  const config = getConfig();
  const actor = await requireUser();
  return getSubscriptionForUser(
    actor.userId,
    documentClient(config.region),
    config.profileTable,
    config.listingsTable,
  );
});

export const initiateSubscriptionPayment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => paymentSchema.parse(input))
  .handler(async ({ data }) => {
    noStore();
    if (!hasProductionConfig())
      throw new Error(
        "Subscription payments are not configured. Add FarmX AWS and Paystack server settings before accepting payment.",
      );
    const config = getConfig();
    const actor = await requireUser();
    const plan = getPlan(data.tier);
    if (!plan || plan.price <= 0) throw new Error("That subscription plan is not available.");
    const client = documentClient(config.region);
    const current = await getSubscriptionForUser(actor.userId, client, config.profileTable);
    if (current.status === "ACTIVE" && current.tier === plan.tier)
      throw new Error("You are already on this plan.");

    const reference = createReference();
    const now = new Date().toISOString();
    const transactionItem = {
      pk: `USER#${actor.userId}`,
      sk: `TXN#${now}#${reference}`,
      gsi1pk: `TXN_REF#${reference}`,
      gsi1sk: now,
      entityType: "TRANSACTION",
      transactionId: reference,
      reference,
      paymentType: "subscription",
      serviceType: "subscription",
      serviceLabel: `FarmX ${plan.name} subscription`,
      planTier: plan.tier,
      planName: plan.name,
      amount: plan.price,
      paymentMethod: data.paymentMethod,
      status: "pending",
      createdAt: now,
    };

    if (data.paymentMethod === "wallet") {
      const subscriptionItem = makeSubscriptionItem(actor.userId, plan.tier, reference, now);
      await client.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Update: {
                TableName: config.profileTable,
                Key: { pk: `USER#${actor.userId}`, sk: "PROFILE" },
                UpdateExpression: "SET cashBalance = cashBalance - :amount",
                ConditionExpression: "attribute_exists(pk) AND cashBalance >= :amount",
                ExpressionAttributeValues: { ":amount": plan.price },
              },
            },
            {
              Put: {
                TableName: config.profileTable,
                Item: { ...transactionItem, status: "successful", verifiedAt: now },
                ConditionExpression: "attribute_not_exists(pk)",
              },
            },
            { Put: { TableName: config.profileTable, Item: subscriptionItem } },
          ],
        }),
      );
      await writeWalletNotification(client, config.profileTable, actor.userId, {
        reference,
        eventId: `subscription:${reference}:successful`,
        title: "FarmX subscription activated",
        body: `Your ${plan.name} plan is now active.`,
      });
      return { reference, status: "successful" as const, amount: plan.price, planName: plan.name };
    }

    const secret = await getPaystackSecret();
    if (!secret)
      throw new Error(
        "FarmX payment provider is not configured. Add PAYSTACK_SECRET_KEY on the server before accepting subscriptions.",
      );
    if (!actor.email)
      throw new Error(
        "Add a verified email address to your FarmX profile before starting payment.",
      );

    await client.send(
      new PutCommand({
        TableName: config.profileTable,
        Item: transactionItem,
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
    const channels =
      data.paymentMethod === "card"
        ? ["card"]
        : data.paymentMethod === "bank_transfer"
          ? ["bank_transfer"]
          : ["ussd"];
    const providerResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: actor.email,
        amount: Math.round(plan.price * 100),
        reference,
        channels,
        callback_url: process.env.FARMX_PAYMENT_CALLBACK_URL,
        metadata: { paymentType: "subscription", planTier: plan.tier, farmxUserId: actor.userId },
      }),
    });
    const payload = (await providerResponse.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string; reference?: string };
    };
    if (!providerResponse.ok || !payload.status || !payload.data?.authorization_url) {
      await client
        .send(
          new UpdateCommand({
            TableName: config.profileTable,
            Key: { pk: transactionItem.pk, sk: transactionItem.sk },
            UpdateExpression: "SET #status = :status, failureReason = :reason",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: {
              ":status": "failed",
              ":reason": payload.message ?? "Payment provider could not start checkout.",
            },
          }),
        )
        .catch(() => undefined);
      throw new Error(payload.message ?? "The payment provider could not start checkout.");
    }
    await client.send(
      new UpdateCommand({
        TableName: config.profileTable,
        Key: { pk: transactionItem.pk, sk: transactionItem.sk },
        UpdateExpression: "SET providerReference = :providerReference, checkoutUrl = :checkoutUrl",
        ExpressionAttributeValues: {
          ":providerReference": payload.data.reference ?? reference,
          ":checkoutUrl": payload.data.authorization_url,
        },
      }),
    );
    return {
      reference,
      status: "pending" as const,
      amount: plan.price,
      planName: plan.name,
      checkoutUrl: payload.data.authorization_url,
    };
  });

export const verifySubscriptionPayment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => referenceSchema.parse(input))
  .handler(async ({ data }) => {
    noStore();
    if (!hasProductionConfig()) throw new Error("Subscription verification is not configured.");
    const config = getConfig();
    const actor = await requireUser();
    const client = documentClient(config.region);
    const query = await client.send(
      new QueryCommand({
        TableName: config.profileTable,
        KeyConditionExpression: "pk = :user AND begins_with(sk, :prefix)",
        FilterExpression: "reference = :reference AND paymentType = :paymentType",
        ExpressionAttributeValues: {
          ":user": `USER#${actor.userId}`,
          ":prefix": "TXN#",
          ":reference": data.reference,
          ":paymentType": "subscription",
        },
        Limit: 1,
      }),
    );
    const transaction = query.Items?.[0] as Record<string, unknown> | undefined;
    if (!transaction) throw new Error("Subscription transaction not found.");
    if (transaction.status === "successful")
      return { verified: true, reference: data.reference, status: "successful" as const };
    const secret = await getPaystackSecret();
    if (!secret) throw new Error("FarmX payment provider is not configured for verification.");
    const providerResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(String(transaction.providerReference ?? data.reference))}`,
      { headers: { Authorization: `Bearer ${secret}` } },
    );
    const payload = (await providerResponse.json()) as {
      status?: boolean;
      message?: string;
      data?: { status?: string; amount?: number };
    };
    if (!providerResponse.ok || !payload.status || payload.data?.status !== "success")
      throw new Error(payload.message ?? "Payment has not been confirmed by the provider.");
    if (payload.data.amount !== Math.round(Number(transaction.amount ?? 0) * 100))
      throw new Error("The verified payment amount does not match this FarmX subscription.");

    const tier = String(transaction.planTier) as SubscriptionTier;
    const plan = getPlan(tier);
    if (!plan)
      throw new Error("The subscription plan attached to this transaction is no longer available.");
    const now = new Date().toISOString();
    await client
      .send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Update: {
                TableName: config.profileTable,
                Key: { pk: transaction.pk, sk: transaction.sk },
                UpdateExpression: "SET #status = :status, verifiedAt = :verifiedAt",
                ExpressionAttributeNames: { "#status": "status" },
                ExpressionAttributeValues: { ":status": "successful", ":verifiedAt": now },
                ConditionExpression: "#status <> :successful",
              },
            },
            {
              Put: {
                TableName: config.profileTable,
                Item: makeSubscriptionItem(actor.userId, tier, data.reference, now),
              },
            },
          ],
        }),
      )
      .catch(async (error) => {
        if (String(error?.name) === "TransactionCanceledException") {
          const current = await getSubscriptionForUser(actor.userId, client, config.profileTable);
          if (current.reference === data.reference && current.status === "ACTIVE") return;
        }
        throw error;
      });
    await writeWalletNotification(client, config.profileTable, actor.userId, {
      reference: data.reference,
      eventId: `subscription:${data.reference}:successful`,
      title: "FarmX subscription activated",
      body: `Your ${plan.name} plan is now active.`,
    });
    return { verified: true, reference: data.reference, status: "successful" as const };
  });

export const setSubscriptionAutoRenew = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => autoRenewSchema.parse(input))
  .handler(async ({ data }) => {
    noStore();
    if (!hasProductionConfig()) throw new Error("Subscription management is not configured.");
    const config = getConfig();
    const actor = await requireUser();
    const client = documentClient(config.region);
    const current = await getSubscriptionForUser(actor.userId, client, config.profileTable);
    if (current.tier === "FREE" || current.status !== "ACTIVE")
      throw new Error("Auto-renew is available only for an active paid plan.");
    await client.send(
      new UpdateCommand({
        TableName: config.profileTable,
        Key: { pk: `USER#${actor.userId}`, sk: "SUBSCRIPTION" },
        UpdateExpression: "SET autoRenew = :enabled, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":enabled": data.enabled,
          ":updatedAt": new Date().toISOString(),
        },
      }),
    );
    return { ...current, autoRenew: data.enabled };
  });

export const cancelSubscription = createServerFn({ method: "POST" }).handler(async () => {
  noStore();
  if (!hasProductionConfig()) throw new Error("Subscription management is not configured.");
  const config = getConfig();
  const actor = await requireUser();
  const client = documentClient(config.region);
  const current = await getSubscriptionForUser(actor.userId, client, config.profileTable);
  if (current.tier === "FREE") return current;
  await client.send(
    new UpdateCommand({
      TableName: config.profileTable,
      Key: { pk: `USER#${actor.userId}`, sk: "SUBSCRIPTION" },
      UpdateExpression: "SET #status = :status, autoRenew = :autoRenew, cancelledAt = :cancelledAt",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":status": "CANCELLED",
        ":autoRenew": false,
        ":cancelledAt": new Date().toISOString(),
      },
    }),
  );
  return { ...current, status: "CANCELLED" as const, autoRenew: false };
});

async function updateSubscriptionFromWebhook(
  reference: string,
  status: "successful" | "failed" | "refunded",
  amount: number | undefined,
) {
  const config = getConfig();
  const client = documentClient(config.region);
  const query = await client.send(
    new QueryCommand({
      TableName: config.profileTable,
      IndexName: "GSI1",
      KeyConditionExpression: "gsi1pk = :ref",
      ExpressionAttributeValues: { ":ref": `TXN_REF#${reference}` },
      Limit: 1,
    }),
  );
  const transaction = query.Items?.[0] as Record<string, unknown> | undefined;
  if (!transaction || transaction.paymentType !== "subscription")
    throw new Error("Subscription transaction not found.");
  if (transaction.status === "successful" && status === "successful")
    return { processed: true, duplicate: true, reference, status };
  if (
    status === "successful" &&
    amount !== undefined &&
    amount !== Math.round(Number(transaction.amount ?? 0) * 100)
  )
    return { processed: false, reason: "amount_mismatch", reference };
  const userId = String(transaction.pk).replace(/^USER#/, "");
  const now = new Date().toISOString();
  if (status === "successful") {
    const tier = String(transaction.planTier) as SubscriptionTier;
    const plan = getPlan(tier);
    if (!plan) throw new Error("Subscription plan not found.");
    await client.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: config.profileTable,
              Key: { pk: transaction.pk, sk: transaction.sk },
              UpdateExpression: "SET #status = :status, verifiedAt = :now",
              ExpressionAttributeNames: { "#status": "status" },
              ExpressionAttributeValues: { ":status": status, ":now": now },
              ConditionExpression: "#status <> :successful",
            },
          },
          {
            Put: {
              TableName: config.profileTable,
              Item: makeSubscriptionItem(userId, tier, reference, now),
            },
          },
        ],
      }),
    );
    await writeWalletNotification(client, config.profileTable, userId, {
      reference,
      eventId: `subscription:${reference}:successful`,
      title: "FarmX subscription activated",
      body: `Your ${plan.name} plan is now active.`,
    });
  } else {
    await client.send(
      new UpdateCommand({
        TableName: config.profileTable,
        Key: { pk: transaction.pk, sk: transaction.sk },
        UpdateExpression: "SET #status = :status, updatedAt = :now",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":status": status, ":now": now },
        ConditionExpression: "#status <> :successful",
      }),
    );
    await writeWalletNotification(client, config.profileTable, userId, {
      reference,
      eventId: `subscription:${reference}:${status}`,
      title: "FarmX subscription payment update",
      body: `Your subscription payment status is ${status}.`,
    });
  }
  return { processed: true, reference, status };
}

export const handleSubscriptionWebhook = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => webhookSchema.parse(input))
  .handler(async ({ data }) => {
    noStore();
    if (!hasProductionConfig()) return { processed: true, reference: data.data.reference };
    const secret = await getPaystackSecret();
    const signature =
      getRequestHeader("x-paystack-signature") ?? getRequestHeader("x-farmx-signature");
    if (!secret || !signature) throw new Error("Webhook verification is not configured.");
    const expected = createHmac("sha512", secret).update(JSON.stringify(data)).digest("hex");
    const actualBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    )
      throw new Error("Invalid payment webhook signature.");
    const status =
      data.data.status === "success"
        ? "successful"
        : data.data.status === "reversed" || data.data.status === "refunded"
          ? "refunded"
          : "failed";
    return updateSubscriptionFromWebhook(data.data.reference, status, data.data.amount);
  });

export async function getSubscriptionLimitForUser(userId: string) {
  if (!hasProductionConfig()) return SUBSCRIPTION_PLANS[0].maxListings;
  const config = getConfig();
  const subscription = await getSubscriptionForUser(
    userId,
    documentClient(config.region),
    config.profileTable,
  );
  return getPlan(subscription.tier)?.maxListings ?? SUBSCRIPTION_PLANS[0].maxListings;
}
