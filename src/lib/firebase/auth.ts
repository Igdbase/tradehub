import {
  getIdTokenResult,
  signInWithEmailAndPassword,
  signOut,
  type IdTokenResult,
  type User
} from "firebase/auth";
import type { AuthSession, TradeHubRole } from "@/types/auth";
import { getFirebaseAuthClient, getFirebaseClientConfigState } from "@/lib/firebase/client";

const roleHomeMap: Record<TradeHubRole, string> = {
  super_admin: "/admin",
  influencer: "/workspace",
  student: "/app"
};

const safeNextPrefixes = ["/admin", "/workspace", "/app"] as const;

function createSignedOutSession(): AuthSession {
  return {
    status: "signed_out",
    uid: null,
    email: null,
    role: null,
    workspaceId: null,
    claimsLoaded: true
  };
}

export function getInitialLoadingSession(): AuthSession {
  return {
    status: "loading",
    uid: null,
    email: null,
    role: null,
    workspaceId: null,
    claimsLoaded: false
  };
}

export function getSignedOutSession() {
  return createSignedOutSession();
}

export function parseTradeHubRole(value: unknown): TradeHubRole | null {
  return value === "super_admin" || value === "influencer" || value === "student" ? value : null;
}

function buildSessionFromToken(user: User, tokenResult: IdTokenResult): AuthSession {
  const role = parseTradeHubRole(tokenResult.claims.role);
  const workspaceId =
    typeof tokenResult.claims.workspaceId === "string" && tokenResult.claims.workspaceId.trim().length > 0
      ? tokenResult.claims.workspaceId
      : null;

  return {
    status: "signed_in",
    uid: user.uid,
    email: user.email,
    role,
    workspaceId,
    claimsLoaded: true
  };
}

export async function hydrateAuthSession(user: User, forceRefresh = false) {
  const tokenResult = await getIdTokenResult(user, forceRefresh);
  return buildSessionFromToken(user, tokenResult);
}

export function sanitizeNextPath(nextPath?: string | null) {
  if (!nextPath) {
    return null;
  }

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return null;
  }

  if (nextPath === "/login" || nextPath.startsWith("/login?") || nextPath.startsWith("/access-pending")) {
    return null;
  }

  const matchesAllowedPrefix = safeNextPrefixes.some(
    (prefix) => nextPath === prefix || nextPath.startsWith(`${prefix}/`)
  );

  return matchesAllowedPrefix ? nextPath : null;
}

export function getRoleHome(role: TradeHubRole) {
  return roleHomeMap[role];
}

export function canRoleAccessPath(role: TradeHubRole, path: string) {
  const safePath = sanitizeNextPath(path);

  if (!safePath) {
    return false;
  }

  if (role === "super_admin") {
    return safePath === "/admin";
  }

  if (role === "influencer") {
    return safePath === "/workspace" || safePath.startsWith("/workspace/");
  }

  return safePath === "/app";
}

export function resolvePostLoginPath(role: TradeHubRole | null, requestedNext?: string | null) {
  if (!role) {
    return "/access-pending";
  }

  const safeNext = sanitizeNextPath(requestedNext);
  return safeNext && canRoleAccessPath(role, safeNext) ? safeNext : getRoleHome(role);
}

export async function signInWithTradeHubEmail(email: string, password: string) {
  const configState = getFirebaseClientConfigState();

  if (!configState.configured) {
    throw new Error(configState.errorMessage ?? "Firebase client configuration is incomplete.");
  }

  const auth = getFirebaseAuthClient();

  if (!auth) {
    throw new Error("Firebase Auth is unavailable in this environment.");
  }

  return signInWithEmailAndPassword(auth, email, password);
}

export async function signOutTradeHubUser() {
  const auth = getFirebaseAuthClient();

  if (!auth) {
    return;
  }

  await signOut(auth);
}
