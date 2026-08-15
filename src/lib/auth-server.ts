import { getRequestHeader } from "@tanstack/react-start/server";
import { CognitoJwtVerifier } from "aws-jwt-verify";

export function getAuthConfig() {
  let userPoolId = process.env.COGNITO_USER_POOL_ID ?? process.env.VITE_COGNITO_USER_POOL_ID;

  // Auto-fix common typo: u-west-1 -> eu-west-1
  if (userPoolId?.startsWith("u-west-1")) {
    userPoolId = "e" + userPoolId;
  }
  const clientId = process.env.COGNITO_WEB_CLIENT_ID ?? process.env.VITE_COGNITO_WEB_CLIENT_ID;

  if (!userPoolId || !clientId) {
    throw new Error("Cognito is not configured on the server.");
  }

  return { userPoolId, clientId };
}

export async function requireAuthenticatedUser() {
  const authorization = getRequestHeader("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("You must be signed in to perform this action.");
  }

  const token = authorization.slice("Bearer ".length);
  const { userPoolId, clientId } = getAuthConfig();

  const verifier = CognitoJwtVerifier.create({
    userPoolId,
    tokenUse: "id",
    clientId,
  });

  try {
    const claims = await verifier.verify(token);
    if (!claims.sub) {
      throw new Error("Your identity could not be verified.");
    }
    return {
      userId: claims.sub,
      email: typeof claims.email === "string" ? claims.email : undefined,
      groups: Array.isArray(claims["cognito:groups"]) ? claims["cognito:groups"].map(String) : [],
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("JWT Verification failed:", error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
}
