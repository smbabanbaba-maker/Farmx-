import { getServerEnv } from "@/lib/server-env";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeaders } from "@tanstack/react-start/server";
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
import { getAwsClientOptions } from "@/lib/aws-config";
import { requireAuthenticatedUser } from "@/lib/auth-server";
import { getPaystackSecret } from "./paystack-server";

const serviceTypes = [
  "boost",
  "featured",
  "top_placement",
  "highlight",
  "business_promotion",
] as const;
const paymentMethods = ["card", "bank_transfer", "ussd", "promotional_credits"] as const;
const transactionStatuses = ["successful", "pending", "failed", "refunded"] as const;

const servicePaymentSchema = z.object({
  serviceType: z.enum(serviceTypes),
  packageId: z.string().trim().min(1).max(128),
  listingId: z.string().trim().min(1).max(128).optional(),
  paymentMethod: z.enum(paymentMethods),
});

const verifyPaymentSchema = z.object({
  reference: z.string().trim().min(1).max(128),
});

const webhookSchema = z.object({
  event: z.string().trim().min(1).max(128),
  data: z.object({
    reference: z.string().trim().min(1).max(128),
    status: z.string().trim().min(1).max(64),
    amount: z.number().optional(),
    customer: z.object({ email: z.string().optional() }).optional(),
  }),
  rawBody: z.string().min(1).optional(),
});

function getConfig() {
  const region = process.env.AWS_REGION;
  const profileTable = getServerEnv("GOALL26_PROFILE_TABLE", "FARMX_PROFILE_TABLE");
  const listingsTable = getServerEnv("GOALL26_LISTINGS_TABLE", "FARMX_LISTINGS_TABLE");
  if (!region || !profileTable || !listingsTable) {
    throw new Error(
      "Wallet service is not configured. Set AWS_REGION, GOALL26_PROFILE_TABLE, and GOALL26_LISTINGS_TABLE.",
    );
  }
  return { region, profileTable, listingsTable };
}

function documentClient(region: string) {
  return DynamoDBDocumentClient.from(new DynamoDBClient(getAwsClientOptions(region)), {
    marshallOptions: { removeUndefinedValues: true },
  });
}

function privateResponse() {
  setResponseHeaders(new Headers({ "Cache-Control": "no-store", Vary: "Cookie, Authorization" }));
}

export async function writeWalletNotification(
  client: DynamoDBDocumentClient,
  profileTable: string,
  userId: string,
  input: { reference: string; title: string; body: string; eventId: string },
) {
  const now = new Date().toISOString();
  await client
    .send(
      new PutCommand({
        TableName: profileTable,
        Item: {
          pk: `USER#${userId}`,
          sk: `NOTIFICATION#${now}#${input.eventId}`,
          entityType: "NOTIFICATION",
          notificationId: input.eventId,
          eventId: input.eventId,
          category: "billing",
          type: "billing",
          title: input.title,
          body: input.body,
          targetUrl: "/wallet",
          createdAt: now,
          read: false,
          reference: input.reference,
        },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    )
    .catch(() => undefined);
}

async function requireUser() {
  const actor = await requireAuthenticatedUser();
  return { userId: actor.userId, email: actor.email };
}

export type WalletSummary = {
  cashBalance: number;
  promotionalCredits: number;
  pendingAmount: number;
  currency: string;
};

export type WalletServicePackage = {
  id: string;
  durationDays: number;
  amount: number;
  currency: "NGN";
};

export type WalletService = {
  id: (typeof serviceTypes)[number];
  label: string;
  description: string;
  note?: string;
  packages: WalletServicePackage[];
  requiresListing: boolean;
};

function configuredServices(): WalletService[] {
  const raw = getServerEnv("GOALL26_SERVICE_PACKAGES_JSON", "FARMX_SERVICE_PACKAGES_JSON");
  if (!raw) {
    throw new Error(
      "Goall26 services are not configured. Set GOALL26_SERVICE_PACKAGES_JSON on the server before accepting payments.",
    );
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return z
      .array(
        z.object({
          id: z.enum(serviceTypes),
          label: z.string().min(1),
          description: z.string().min(1),
          note: z.string().optional(),
          requiresListing: z.boolean(),
          packages: z
            .array(
              z.object({
                id: z.string().min(1),
                durationDays: z.number().int().min(1).max(365),
                amount: z.number().min(100),
                currency: z.literal("NGN"),
              }),
            )
            .min(1),
        }),
      )
      .parse(parsed);
  } catch {
    throw new Error(
      "GOALL26_SERVICE_PACKAGES_JSON is invalid. Configure Goall26 service packages before accepting payments.",
    );
  }
}

export const getWalletServices = createServerFn({ method: "GET" }).handler(async () =>
  configuredServices(),
);

export type Goall26Transaction = {
  id: string;
  reference: string;
  serviceType: string;
  serviceLabel: string;
  listingTitle?: string;
  amount: number;
  paymentMethod: string;
  status: "successful" | "pending" | "failed" | "refunded";
  createdAt: string;
  activatedUntil?: string;
};

export const getWalletSummary = createServerFn({ method: "GET" }).handler(async () => {
  privateResponse();
  const config = getConfig();
  const actor = await requireUser();
  const client = documentClient(config.region);
  const profile = await client.send(
    new GetCommand({
      TableName: config.profileTable,
      Key: { pk: `USER#${actor.userId}`, sk: "PROFILE" },
    }),
  );
  const item = profile.Item as Record<string, unknown> | undefined;
  return {
    cashBalance: typeof item?.cashBalance === "number" ? item.cashBalance : 0,
    promotionalCredits: typeof item?.promotionalCredits === "number" ? item.promotionalCredits : 0,
    pendingAmount: typeof item?.pendingAmount === "number" ? item.pendingAmount : 0,
    currency: "NGN",
  } satisfies WalletSummary;
});

export const getTransactions = createServerFn({ method: "GET" }).handler(async () => {
  privateResponse();
  const config = getConfig();
  const actor = await requireUser();
  const client = documentClient(config.region);
  const result = await client.send(
    new QueryCommand({
      TableName: config.profileTable,
      KeyConditionExpression: "pk = :user AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: { ":user": `USER#${actor.userId}`, ":prefix": "TXN#" },
      ScanIndexForward: false,
      Limit: 50,
    }),
  );
  return (result.Items ?? []).map((item) => ({
    id: String(item.transactionId ?? item.sk),
    reference: String(item.reference ?? item.transactionId),
    serviceType: String(item.serviceType ?? "service"),
    serviceLabel: String(item.serviceLabel ?? "Goall26 Service"),
    listingTitle: typeof item.listingTitle === "string" ? item.listingTitle : undefined,
    amount: Number(item.amount ?? 0),
    paymentMethod: String(item.paymentMethod ?? "card"),
    status: (item.status as Goall26Transaction["status"]) ?? "successful",
    createdAt: String(item.createdAt ?? new Date().toISOString()),
    activatedUntil: typeof item.activatedUntil === "string" ? item.activatedUntil : undefined,
  })) satisfies Goall26Transaction[];
});

export const initiateServicePayment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => servicePaymentSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const services = configuredServices();
    const service = services.find((item) => item.id === data.serviceType);
    const selectedPackage = service?.packages.find((item) => item.id === data.packageId);
    if (!service || !selectedPackage)
      throw new Error("That Goall26 service package is no longer available.");
    if (service.requiresListing && !data.listingId)
      throw new Error("Select an eligible listing for this Goall26 service.");
    const reference = `TXN-${Math.random().toString(36).slice(2, 8).toUpperCase()}${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const serviceLabel = service.label;

    const config = getConfig();
    const actor = await requireUser();
    const client = documentClient(config.region);

    let listingTitle: string | undefined;
    if (data.listingId) {
      const listingResult = await client.send(
        new GetCommand({
          TableName: config.listingsTable,
          Key: { pk: `LISTING#${data.listingId}`, sk: `LISTING#${data.listingId}` },
        }),
      );
      const listing = listingResult.Item as Record<string, unknown> | undefined;
      listingTitle = typeof listing?.title === "string" ? listing.title : undefined;
    }

    let checkoutUrl: string | undefined;
    let providerReference: string | undefined;
    const initialStatus: "pending" | "successful" = "pending";

    if (data.paymentMethod === "promotional_credits") {
      // The atomic debit below creates a pending transaction; verification activates the service.
    } else {
      const secret = await getPaystackSecret();
      if (!secret)
        throw new Error(
          "Goall26 payment provider is not configured. Add PAYSTACK_SECRET_KEY on the server before accepting payments.",
        );
      if (!actor.email)
        throw new Error(
          "Add a verified email address to your Goall26 profile before starting payment.",
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
          amount: Math.round(selectedPackage.amount * 100),
          reference,
          channels,
          callback_url: getServerEnv("GOALL26_PAYMENT_CALLBACK_URL", "FARMX_PAYMENT_CALLBACK_URL"),
          metadata: {
            serviceType: data.serviceType,
            packageId: selectedPackage.id,
            listingId: data.listingId,
            goall26UserId: actor.userId,
          },
        }),
      });
      const providerPayload = (await providerResponse.json()) as {
        status?: boolean;
        message?: string;
        data?: { authorization_url?: string; reference?: string };
      };
      if (
        !providerResponse.ok ||
        !providerPayload.status ||
        !providerPayload.data?.authorization_url
      )
        throw new Error(
          providerPayload.message ?? "The payment provider could not start checkout.",
        );
      checkoutUrl = providerPayload.data.authorization_url;
      providerReference = providerPayload.data.reference;
    }

    const transactionItem = {
      pk: `USER#${actor.userId}`,
      sk: `TXN#${now}#${reference}`,
      gsi1pk: `TXN_REF#${reference}`,
      gsi1sk: now,
      entityType: "TRANSACTION",
      transactionId: reference,
      reference,
      providerReference,
      serviceType: data.serviceType,
      serviceLabel,
      listingId: data.listingId,
      listingTitle,
      durationDays: selectedPackage.durationDays,
      packageId: selectedPackage.id,
      amount: selectedPackage.amount,
      paymentMethod: data.paymentMethod,
      status: initialStatus,
      createdAt: now,
    };

    if (data.paymentMethod === "promotional_credits") {
      await client.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Update: {
                TableName: config.profileTable,
                Key: { pk: `USER#${actor.userId}`, sk: "PROFILE" },
                UpdateExpression: "SET promotionalCredits = promotionalCredits - :amount",
                ConditionExpression: "attribute_exists(pk) AND promotionalCredits >= :amount",
                ExpressionAttributeValues: { ":amount": selectedPackage.amount },
              },
            },
            {
              Put: {
                TableName: config.profileTable,
                Item: transactionItem,
                ConditionExpression: "attribute_not_exists(pk)",
              },
            },
          ],
        }),
      );
    } else {
      await client.send(
        new PutCommand({
          TableName: config.profileTable,
          Item: transactionItem,
          ConditionExpression: "attribute_not_exists(pk)",
        }),
      );
    }

    return {
      reference,
      checkoutUrl,
      amount: selectedPackage.amount,
      durationDays: selectedPackage.durationDays,
      serviceLabel,
      status: initialStatus,
    };
  });

export const verifyServicePayment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => verifyPaymentSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const config = getConfig();
    const actor = await requireUser();
    const client = documentClient(config.region);

    const result = await client.send(
      new QueryCommand({
        TableName: config.profileTable,
        KeyConditionExpression: "pk = :user AND begins_with(sk, :prefix)",
        FilterExpression: "reference = :ref",
        ExpressionAttributeValues: {
          ":user": `USER#${actor.userId}`,
          ":prefix": "TXN#",
          ":ref": data.reference,
        },
        Limit: 1,
      }),
    );

    const txn = result.Items?.[0];
    if (!txn) throw new Error("Transaction not found.");
    if (txn.status === "successful")
      return {
        verified: true,
        reference: data.reference,
        status: "successful",
        activatedUntil: typeof txn.activatedUntil === "string" ? txn.activatedUntil : undefined,
      };
    if (txn.paymentMethod !== "promotional_credits") {
      const secret = await getPaystackSecret();
      if (!secret) throw new Error("Goall26 payment provider is not configured for verification.");
      const providerResponse = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(String(txn.providerReference ?? data.reference))}`,
        { headers: { Authorization: `Bearer ${secret}` } },
      );
      const providerPayload = (await providerResponse.json()) as {
        status?: boolean;
        message?: string;
        data?: { status?: string; amount?: number; reference?: string };
      };
      const expectedAmount = Math.round(Number(txn.amount ?? 0) * 100);
      if (
        !providerResponse.ok ||
        !providerPayload.status ||
        providerPayload.data?.status !== "success"
      )
        throw new Error(
          providerPayload.message ?? "Payment has not been confirmed by the provider.",
        );
      if (providerPayload.data.amount !== expectedAmount)
        throw new Error("The verified payment amount does not match this Goall26 service.");
    }

    const now = new Date().toISOString();
    const durationDays = Number(txn.durationDays ?? 7);
    const activatedUntil = new Date(Date.now() + durationDays * 86_400_000).toISOString();

    await client.send(
      new UpdateCommand({
        TableName: config.profileTable,
        Key: { pk: txn.pk, sk: txn.sk },
        UpdateExpression:
          "SET #status = :status, activatedUntil = :activatedUntil, verifiedAt = :verifiedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":status": "successful",
          ":activatedUntil": activatedUntil,
          ":verifiedAt": now,
        },
      }),
    );

    if (txn.listingId) {
      await client
        .send(
          new UpdateCommand({
            TableName: config.listingsTable,
            Key: { pk: `LISTING#${txn.listingId}`, sk: `LISTING#${txn.listingId}` },
            UpdateExpression: "SET promoExpiresAt = :expires, serviceType = :service",
            ExpressionAttributeValues: {
              ":expires": activatedUntil,
              ":service": txn.serviceType,
            },
          }),
        )
        .catch(() => {});
    }

    await writeWalletNotification(client, config.profileTable, actor.userId, {
      reference: data.reference,
      eventId: `wallet:${data.reference}:successful`,
      title: "Goall26 service activated",
      body: `${String(txn.serviceLabel ?? "Goall26 service")} is now active.`,
    });
    return { verified: true, reference: data.reference, status: "successful", activatedUntil };
  });

export const handleServiceWebhook = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => webhookSchema.parse(input))
  .handler(async ({ data }) => {
    privateResponse();
    const secret = await getPaystackSecret();
    const signature =
      getRequestHeader("x-paystack-signature") ?? getRequestHeader("x-farmx-signature");
    if (!secret || !signature) throw new Error("Webhook verification is not configured.");
    const signedBody = data.rawBody ?? JSON.stringify({ event: data.event, data: data.data });
    const expected = createHmac("sha512", secret).update(signedBody).digest("hex");
    const actualBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    )
      throw new Error("Invalid payment webhook signature.");
    const config = getConfig();
    const client = documentClient(config.region);
    const result = await client.send(
      new QueryCommand({
        TableName: config.profileTable,
        IndexName: "GSI1",
        KeyConditionExpression: "gsi1pk = :ref",
        ExpressionAttributeValues: { ":ref": `TXN_REF#${data.data.reference}` },
        Limit: 1,
      }),
    );
    const txn = result.Items?.[0];
    if (!txn) throw new Error("transaction_not_found");
    if (txn.status === "successful" && data.data.status === "success")
      return {
        processed: true,
        duplicate: true,
        reference: data.data.reference,
        status: "successful",
      };

    const status =
      data.data.status === "success"
        ? "successful"
        : data.data.status === "reversed" || data.data.status === "refunded"
          ? "refunded"
          : "failed";
    if (
      status === "successful" &&
      typeof data.data.amount === "number" &&
      data.data.amount !== Math.round(Number(txn.amount ?? 0) * 100)
    )
      return { processed: false, reason: "amount_mismatch", reference: data.data.reference };
    const processedAt = new Date().toISOString();
    const activatedUntil =
      status === "successful"
        ? new Date(Date.now() + Number(txn.durationDays ?? 7) * 86_400_000).toISOString()
        : undefined;
    if (status === "successful") {
      await client.send(
        new UpdateCommand({
          TableName: config.profileTable,
          Key: { pk: txn.pk, sk: txn.sk },
          UpdateExpression:
            "SET #status = :status, webhookProcessedAt = :processedAt, activatedUntil = :activatedUntil, verifiedAt = :verifiedAt",
          ExpressionAttributeNames: { "#status": "status" },
          ConditionExpression: "attribute_not_exists(webhookProcessedAt) OR #status <> :successful",
          ExpressionAttributeValues: {
            ":status": status,
            ":processedAt": processedAt,
            ":activatedUntil": activatedUntil,
            ":verifiedAt": processedAt,
            ":successful": "successful",
          },
        }),
      );
      if (txn.listingId)
        await client.send(
          new UpdateCommand({
            TableName: config.listingsTable,
            Key: { pk: `LISTING#${txn.listingId}`, sk: `LISTING#${txn.listingId}` },
            UpdateExpression: "SET promoExpiresAt = :expires, serviceType = :service",
            ExpressionAttributeValues: { ":expires": activatedUntil, ":service": txn.serviceType },
          }),
        );
    } else {
      await client.send(
        new UpdateCommand({
          TableName: config.profileTable,
          Key: { pk: txn.pk, sk: txn.sk },
          UpdateExpression: "SET #status = :status, webhookProcessedAt = :processedAt",
          ExpressionAttributeNames: { "#status": "status" },
          ConditionExpression: "attribute_not_exists(webhookProcessedAt)",
          ExpressionAttributeValues: { ":status": status, ":processedAt": processedAt },
        }),
      );
    }
    await writeWalletNotification(
      client,
      config.profileTable,
      String(txn.pk).replace(/^USER#/, ""),
      {
        reference: data.data.reference,
        eventId: `wallet:${data.data.reference}:${status}`,
        title:
          status === "successful"
            ? "Goall26 service payment successful"
            : "Goall26 service payment update",
        body:
          status === "successful"
            ? `${String(txn.serviceLabel ?? "Goall26 service")} has been activated.`
            : `Payment status for ${String(txn.serviceLabel ?? "Goall26 service")} is ${status}.`,
      },
    );
    return { processed: true, reference: data.data.reference, status, activatedUntil };
  });
