import { createFileRoute } from "@tanstack/react-router";
import { handleServiceWebhook } from "@/lib/wallet.functions";
import { handleSubscriptionWebhook } from "@/lib/subscription.functions";

export const Route = createFileRoute("/api/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        let payload: { data?: { metadata?: { paymentType?: string } } };
        try {
          payload = JSON.parse(rawBody) as { data?: { metadata?: { paymentType?: string } } };
        } catch {
          return Response.json(
            { error: "Invalid webhook payload." },
            { status: 400, headers: { "Cache-Control": "no-store" } },
          );
        }
        try {
          const webhookData = { ...payload, rawBody };
          const isSubscription = payload.data?.metadata?.paymentType === "subscription";
          const result = await (isSubscription ? handleSubscriptionWebhook : handleServiceWebhook)({
            data: webhookData as never,
          });
          return Response.json(result, { status: 200, headers: { "Cache-Control": "no-store" } });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Webhook processing failed.";
          return Response.json(
            { error: message },
            { status: 400, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
    },
  },
});
