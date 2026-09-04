import type { FirebaseError } from "firebase/app";

const authErrorMessages: Record<string, string> = {
  "auth/invalid-email": "Enter a valid email address before signing in.",
  "auth/user-not-found": "We could not find an account with that email yet.",
  "auth/wrong-password": "The password did not match this TradeHub account.",
  "auth/invalid-credential": "We could not verify that email and password combination.",
  "auth/invalid-login-credentials": "We could not verify that email and password combination.",
  "auth/too-many-requests": "Too many sign-in attempts were blocked. Wait a moment and try again.",
  "auth/network-request-failed": "TradeHub could not reach Firebase. Check your connection and try again."
};

function isFirebaseError(error: unknown): error is FirebaseError {
  return typeof error === "object" && error !== null && "code" in error;
}

export function getFirebaseAuthErrorMessage(error: unknown) {
  if (isFirebaseError(error)) {
    return authErrorMessages[error.code] ?? "TradeHub could not complete that sign-in request.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "TradeHub could not complete that sign-in request.";
}
