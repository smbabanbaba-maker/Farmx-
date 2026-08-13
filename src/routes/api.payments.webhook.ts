import { createFileRoute } from "@tanstack/react-router";
import { handleServiceWebhook } from "@/lib/wallet.functions";
import { handleSubscriptionWebhook } from "@/lib/subscription.functions";

export const Route = createFileRoute("/api/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const payload = (await request.json()) as {
          data?: { metadata?: { paymentType?: string } };
        };
        try {
          const isSubscription = payload.data?.metadata?.paymentType === "subscription";
          const result = await (isSubscription ? handleSubscriptionWebhook : handleServiceWebhook)({
            data: payload as never,
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
