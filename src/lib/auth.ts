import "./polyfills";
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  type CognitoUserSession,
} from "amazon-cognito-identity-js";

const getPoolData = () => {
  let userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID || "eu-west-1_HXI6OOXpg";
  if (userPoolId.startsWith("u-west-1")) {
    userPoolId = "e" + userPoolId;
  }
  return {
    UserPoolId: userPoolId,
    ClientId: import.meta.env.VITE_COGNITO_WEB_CLIENT_ID || "5160g8vs8f7c55fnvovjtgqnab",
  };
};

const poolData = getPoolData();

const userPool = new CognitoUserPool(poolData);

export const PASSWORD_LENGTH = 6;
export const PASSWORD_PATTERN = /^[0-9]{6}$/;
export const VERIFICATION_CODE_LENGTH = 6;

export const PASSWORD_REQUIREMENTS = ["Exactly 6 digits"] as const;

export function isSixDigitPassword(value: string): boolean {
  return typeof value === "string" && PASSWORD_PATTERN.test(value.trim());
}

function assertSixDigitPassword(value: string): void {
  if (!isSixDigitPassword(value)) {
    throw new Error("Password must contain exactly 6 digits.");
  }
}

let sessionCache: { session: CognitoUserSession | null; expiresAt: number } | null = null;
let sessionRequest: Promise<CognitoUserSession | null> | null = null;
const SESSION_CACHE_MS = 15_000;

export async function getCurrentSession(): Promise<CognitoUserSession | null> {
  if (sessionCache && sessionCache.expiresAt > Date.now()) return sessionCache.session;
  if (sessionRequest) return sessionRequest;

  sessionRequest = new Promise<CognitoUserSession | null>((resolve) => {
    const user = userPool.getCurrentUser();
    if (!user) {
      resolve(null);
      return;
    }

    const timeout = setTimeout(() => resolve(null), 3000);
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      clearTimeout(timeout);
      resolve(!err && session?.isValid() ? session : null);
    });
  }).finally(() => {
    sessionRequest = null;
  });

  const session = await sessionRequest;
  sessionCache = { session, expiresAt: Date.now() + SESSION_CACHE_MS };
  return session;
}

function clearSessionCache() {
  sessionCache = null;
  sessionRequest = null;
}

export async function getIdToken(): Promise<string | null> {
  const session = await getCurrentSession();
  return session ? session.getIdToken().getJwtToken() : null;
}

function getHostedUiConfig() {
  const domain =
    import.meta.env.VITE_COGNITO_HOSTED_UI_DOMAIN || import.meta.env.VITE_COGNITO_DOMAIN;
  const redirectUri =
    import.meta.env.VITE_COGNITO_REDIRECT_URI ||
    (typeof window !== "undefined" ? `${window.location.origin}/oauth/callback` : "");
  if (!domain || !redirectUri)
    throw new Error("Google sign-in is not configured for this FarmX deployment.");
  return {
    domain: String(domain)
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, ""),
    redirectUri,
  };
}

export function getCognitoHostedUiLoginUrl(provider: "Google" | "Facebook") {
  const config = getHostedUiConfig();
  const params = new URLSearchParams({
    identity_provider: provider,
    redirect_uri: config.redirectUri,
    response_type: "code",
    client_id: poolData.ClientId,
    scope: "openid email profile",
  });
  return `https://${config.domain}/oauth2/authorize?${params.toString()}`;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("The Cognito identity response was invalid.");
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(
    atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="))
      .split("")
      .map((character) => `%${`00${character.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join(""),
  );
  return JSON.parse(json) as Record<string, unknown>;
}

export async function exchangeCognitoHostedUiCode(code: string): Promise<void> {
  const config = getHostedUiConfig();
  const response = await fetch(`https://${config.domain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: poolData.ClientId,
      code,
      redirect_uri: config.redirectUri,
    }),
  });
  if (!response.ok) throw new Error("Google sign-in could not be completed.");
  const tokens = (await response.json()) as {
    id_token?: string;
    access_token?: string;
    refresh_token?: string;
  };
  if (!tokens.id_token || !tokens.access_token)
    throw new Error("Google sign-in returned an incomplete session.");
  const claims = decodeJwtPayload(tokens.id_token);
  const username = String(claims["cognito:username"] ?? claims.sub ?? claims.email ?? "");
  if (!username) throw new Error("Google sign-in returned no user identity.");
  const keyPrefix = `CognitoIdentityServiceProvider.${poolData.ClientId}`;
  localStorage.setItem(`${keyPrefix}.LastAuthUser`, username);
  localStorage.setItem(`${keyPrefix}.${username}.idToken`, tokens.id_token);
  localStorage.setItem(`${keyPrefix}.${username}.accessToken`, tokens.access_token);
  if (tokens.refresh_token)
    localStorage.setItem(`${keyPrefix}.${username}.refreshToken`, tokens.refresh_token);
  localStorage.setItem(`${keyPrefix}.${username}.clockDrift`, "0");
  clearSessionCache();
}

export function signOut() {
  clearSessionCache();
  const user = userPool.getCurrentUser();
  if (user) {
    user.signOut();
  }
  if (typeof window !== "undefined") {
    localStorage.removeItem("farmx-session-active");
  }
}

export async function signIn(email: string, password: string): Promise<unknown> {
  assertSixDigitPassword(password);
  const authenticationData = {
    Username: email,
    Password: password,
  };
  const authenticationDetails = new AuthenticationDetails(authenticationData);
  const userData = {
    Username: email,
    Pool: userPool,
  };
  const cognitoUser = new CognitoUser(userData);

  return new Promise((resolve, reject) => {
    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        clearSessionCache();
        if (typeof window !== "undefined") {
          localStorage.setItem("farmx-session-active", "true");
        }
        resolve(result);
      },
      onFailure: (err) => {
        console.error("Cognito signIn error:", err);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    });
  });
}

export async function signUp(
  email: string,
  password: string,
  name: string,
  phone: string,
): Promise<unknown> {
  assertSixDigitPassword(password);
  const attributeList = [
    new CognitoUserAttribute({
      Name: "email",
      Value: email,
    }),
    new CognitoUserAttribute({
      Name: "name",
      Value: name,
    }),
  ];

  if (phone && phone.trim()) {
    const formattedPhone = phone.startsWith("+") ? phone : `+234${phone.trim().replace(/^0/, "")}`;
    attributeList.push(
      new CognitoUserAttribute({
        Name: "phone_number",
        Value: formattedPhone,
      }),
    );
  }

  console.log(
    "Attempting signup for:",
    email,
    "with attributes:",
    attributeList.map((a) => a.getName()),
  );

  return new Promise((resolve, reject) => {
    userPool.signUp(email, password, attributeList, [], (err, result) => {
      if (err) {
        console.error("Cognito signUp error:", err);
        // Ensure err is an Error object
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }
      console.log("Signup success:", result?.user?.getUsername());
      resolve(result);
    });
  });
}

export async function requestPasswordReset(email: string): Promise<{ destination?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error("Enter the email address for your FarmX account.");
  const cognitoUser = new CognitoUser({ Username: normalizedEmail, Pool: userPool });
  return new Promise((resolve, reject) => {
    cognitoUser.forgotPassword({
      onSuccess: (data) => resolve({ destination: data.CodeDeliveryDetails?.Destination }),
      onFailure: (error) => reject(error instanceof Error ? error : new Error(String(error))),
    });
  });
}

export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^\d{6}$/.test(code))
    throw new Error("The verification code must contain exactly 6 digits.");
  assertSixDigitPassword(newPassword);
  const cognitoUser = new CognitoUser({ Username: normalizedEmail, Pool: userPool });
  return new Promise((resolve, reject) => {
    cognitoUser.confirmPassword(code, newPassword, {
      onSuccess: () => resolve(),
      onFailure: (error) => reject(error instanceof Error ? error : new Error(String(error))),
    });
  });
}

export function getFriendlyAuthError(
  error: unknown,
  context: "signin" | "reset" | "confirm" = "signin",
) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (code === "UserNotConfirmedException" || message.includes("not confirmed"))
    return "Please verify your email before signing in.";
  if (code === "NotAuthorizedException" || message.includes("incorrect username or password"))
    return context === "signin"
      ? "Email or password is incorrect."
      : "We couldn't start password reset. Check your email and try again.";
  if (code === "CodeMismatchException" || message.includes("code mismatch"))
    return "The verification code is incorrect.";
  if (code === "ExpiredCodeException" || message.includes("expired"))
    return "That verification code has expired. Please request a new code.";
  if (code === "InvalidPasswordException" || message.includes("password"))
    return "Your new password does not meet the required security rules.";
  if (code === "LimitExceededException" || message.includes("limit exceeded"))
    return "Too many attempts. Please wait a moment and try again.";
  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("failed to fetch")
  )
    return "We couldn't connect to FarmX. Please check your internet connection and try again.";
  return context === "signin"
    ? "Email or password is incorrect."
    : "We couldn't complete the password reset. Please try again.";
}

export async function confirmSignUp(email: string, code: string): Promise<unknown> {
  const userData = {
    Username: email,
    Pool: userPool,
  };
  const cognitoUser = new CognitoUser(userData);

  return new Promise((resolve, reject) => {
    cognitoUser.confirmRegistration(code, true, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
}
