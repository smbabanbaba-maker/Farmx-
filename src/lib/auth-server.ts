import { getRequestHeader } from "@tanstack/react-start/server";
import { CognitoJwtVerifier } from "aws-jwt-verify";

export function getAuthConfig() {
  let userPoolId = process.env.COGNITO_USER_POOL_ID ?? process.env.VITE_COGNITO_USER_POOL_ID;

  // Force correct ID if it matches the known typo pattern
  if (userPoolId === "u-west-1_HXI6OOXpg" || userPoolId?.startsWith("u-west-1")) {
    userPoolId = "eu-west-1_HXI6OOXpg";
  }

  // Fallback to hardcoded production ID if still missing or wrong
  if (!userPoolId || userPoolId.startsWith("u-west-1")) {
    userPoolId = "eu-west-1_HXI6OOXpg";
  }

  const clientId =
    process.env.COGNITO_WEB_CLIENT_ID ??
    process.env.VITE_COGNITO_WEB_CLIENT_ID ??
    "5160g8vs8f7c55fnvovjtgqnab";

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
      name: typeof claims.name === "string" ? claims.name : undefined,
      groups: Array.isArray(claims["cognito:groups"]) ? claims["cognito:groups"].map(String) : [],
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("JWT Verification failed:", error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
}
