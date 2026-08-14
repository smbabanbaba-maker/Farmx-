import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { getAwsClientOptions } from "@/lib/aws-config";

let cachedSecret: { value: string; expiresAt: number } | null = null;

function getSecretIdentifier() {
  return process.env.FARMX_PAYSTACK_SECRET_ARN ?? process.env.FARMX_PAYSTACK_SECRET_NAME;
}

function parseSecretString(secretString: string) {
  try {
    const parsed = JSON.parse(secretString) as { PAYSTACK_SECRET_KEY?: unknown };
    if (typeof parsed.PAYSTACK_SECRET_KEY === "string" && parsed.PAYSTACK_SECRET_KEY.length > 0) {
      return parsed.PAYSTACK_SECRET_KEY;
    }
  } catch {
    // Support a plain secret value for operational flexibility.
  }
  return secretString.trim();
}

/**
 * Resolve the Paystack secret only on the server. Production deployments read
 * from Secrets Manager; a direct environment variable remains available for
 * local development and controlled CI environments.
 */
export async function getPaystackSecret(): Promise<string | null> {
  const directSecret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (directSecret) return directSecret;

  const identifier = getSecretIdentifier();
  const region = process.env.AWS_REGION;
  if (!identifier || !region) return null;

  if (cachedSecret && cachedSecret.expiresAt > Date.now()) return cachedSecret.value;

  const client = new SecretsManagerClient(getAwsClientOptions(region));
  const result = await client.send(new GetSecretValueCommand({ SecretId: identifier }));
  if (!result.SecretString) return null;

  const secret = parseSecretString(result.SecretString);
  if (!secret) return null;

  cachedSecret = { value: secret, expiresAt: Date.now() + 5 * 60 * 1000 };
  return secret;
}

export function clearPaystackSecretCache() {
  cachedSecret = null;
}
