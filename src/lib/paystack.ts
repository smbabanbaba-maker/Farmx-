/**
 * FarmX ⇄ Paystack (client-side stub)
 *
 * SECURITY:
 *  - Only the PUBLIC key (`pk_*`) ever belongs in the browser.
 *  - The SECRET key (`sk_*`) MUST live in your AWS backend (Lambda / API Gateway)
 *    as an env var (e.g. PAYSTACK_SECRET_KEY). NEVER ship it in the app.
 *  - Charges MUST be verified server-side via GET https://api.paystack.co/transaction/verify/:reference
 *    before you credit the wallet, activate a subscription/promotion, or release escrow.
 *
 * Wire-up:
 *  - Set VITE_PAYSTACK_PUBLIC_KEY in your .env for the frontend.
 *  - Set VITE_API_BASE_URL to your AWS API Gateway base URL.
 *  - Implement these endpoints on AWS:
 *      POST /payments/init         -> returns { authorization_url, reference }  (creates a Paystack tx)
 *      POST /payments/verify       -> body { reference } -> verifies + updates wallet/listing
 *      POST /subscriptions/bluetek -> creates ₦4,500/mo plan for the company
 *      POST /wallet/topup          -> credits FarmX Wallet after verified Paystack tx
 */

export const PAYSTACK_PUBLIC_KEY =
  (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string | undefined) ?? "";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

export type PaymentPurpose =
  | { kind: "promo_week"; productId: string }
  | { kind: "promo_month"; productId: string }
  | { kind: "job_promo"; jobId: string }
  | { kind: "bluetek_subscription"; companyId: string }
  | { kind: "wallet_topup" }
  | { kind: "subscription"; tierId: string }
  | { kind: "escrow"; productId: string };

export interface InitPaymentInput {
  email: string;
  amountNaira: number;
  purpose: PaymentPurpose;
}

export interface InitPaymentResult {
  reference: string;
  authorization_url: string;
}

/**
 * Ask AWS backend to create a Paystack transaction, then redirect user to Paystack.
 * The backend uses PAYSTACK_SECRET_KEY to call https://api.paystack.co/transaction/initialize.
 */
export async function initPayment(input: InitPaymentInput): Promise<InitPaymentResult> {
  if (!API_BASE_URL) {
    // Frontend mock — replace once AWS is live.
    return {
      reference: `mock_${Date.now()}`,
      authorization_url: "#mock-checkout",
    };
  }
  const res = await fetch(`${API_BASE_URL}/payments/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      amount: Math.round(input.amountNaira * 100), // Paystack expects kobo
      purpose: input.purpose,
    }),
  });
  if (!res.ok) throw new Error(`Payment init failed: ${res.status}`);
  return res.json();
}

/** Ask AWS backend to verify a completed Paystack transaction. */
export async function verifyPayment(
  reference: string,
): Promise<{ status: "success" | "failed" | "pending" }> {
  if (!API_BASE_URL) return { status: "success" };
  const res = await fetch(`${API_BASE_URL}/payments/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reference }),
  });
  if (!res.ok) throw new Error(`Verify failed: ${res.status}`);
  return res.json();
}
