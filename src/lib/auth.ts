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
export const PASSWORD_PATTERN = /^\d{6}$/;

export function isSixDigitPassword(value: string): boolean {
  return PASSWORD_PATTERN.test(value);
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
