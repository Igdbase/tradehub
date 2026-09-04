import type { DecodedIdToken } from "firebase-admin/auth";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { AdminApiError } from "@/lib/firebase/admin-errors";

export type VerifiedSuperAdmin = {
  uid: string;
  email?: string;
  token: DecodedIdToken;
};

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");

  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

export function requestHasBearerToken(request: Request) {
  return Boolean(getBearerToken(request));
}

export async function requireSuperAdmin(request: Request): Promise<VerifiedSuperAdmin> {
  const token = getBearerToken(request);

  if (!token) {
    throw new AdminApiError(401, "missing_auth_token", "Sign in before using the Super Admin API.");
  }

  const { auth } = getFirebaseAdminClients();
  let decoded: DecodedIdToken;

  try {
    decoded = await auth.verifyIdToken(token, true);
  } catch {
    throw new AdminApiError(401, "invalid_auth_token", "Your session could not be verified.");
  }

  if (decoded.role !== "super_admin") {
    throw new AdminApiError(403, "super_admin_required", "This endpoint requires Super Admin access.");
  }

  return {
    uid: decoded.uid,
    email: typeof decoded.email === "string" ? decoded.email : undefined,
    token: decoded
  };
}
