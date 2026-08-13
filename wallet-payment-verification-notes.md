# FarmX Wallet payment verification notes

Paystack official documentation confirms that webhooks are the preferred status-confirmation path, while the server should call the Verify Transaction API when receiving a client reference. The webhook endpoint must be publicly reachable, parse JSON, return HTTP 200, and validate the `x-paystack-signature` HMAC SHA512 signature using the Paystack secret key before processing. Paystack retries unacknowledged events, so processing must be idempotent. The transaction status is `response.data.status`, not the top-level response status; successful verification also requires comparing the verified amount against the FarmX transaction amount.

Sources:

- https://paystack.com/docs/payments/webhooks/
- https://paystack.com/docs/payments/verify-payments/

Implementation implication: FarmX must store a pending service transaction before checkout, keep the provider secret server-side, verify the provider reference and amount server-side, avoid double activation when webhooks and callback verification both arrive, and activate only after a verified successful event. The webhook route must use the raw request body for HMAC validation rather than a client-originated success flag.
