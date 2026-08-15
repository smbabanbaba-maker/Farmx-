import "./polyfills";
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  type CognitoUserSession,
} from "amazon-cognito-identity-js";

const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || "eu-west-1_HXI6OOXpg",
  ClientId: import.meta.env.VITE_COGNITO_WEB_CLIENT_ID || "5160g8vs8f7c55fnvovjtgqnab",
};

const userPool = new CognitoUserPool(poolData);

export async function getCurrentSession(): Promise<CognitoUserSession | null> {
  const user = userPool.getCurrentUser();
  if (!user) return null;

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn("Cognito session lookup timed out");
      resolve(null);
    }, 5000); // 5s timeout

    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      clearTimeout(timeout);
      if (err) {
        resolve(null);
      } else {
        if (session && session.isValid()) {
          resolve(session);
        } else {
          resolve(null);
        }
      }
    });
  });
}

export async function getIdToken(): Promise<string | null> {
  const session = await getCurrentSession();
  return session ? session.getIdToken().getJwtToken() : null;
}

export function signOut() {
  const user = userPool.getCurrentUser();
  if (user) {
    user.signOut();
  }
  if (typeof window !== "undefined") {
    localStorage.removeItem("farmx-session-active");
  }
}

export async function signIn(email: string, password: string): Promise<unknown> {
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
        if (typeof window !== "undefined") {
          localStorage.setItem("farmx-session-active", "true");
        }
        resolve(result);
      },
      onFailure: (err) => {
        reject(err);
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
        reject(err);
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
