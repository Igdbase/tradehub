import type { DecodedIdToken } from "firebase-admin/auth";
import { getBearerToken } from "@/lib/firebase/admin-auth";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { AdminApiError } from "@/lib/firebase/admin-errors";

export type VerifiedInfluencer = {
  uid: string;
  email?: string;
  workspaceId: string;
  token: DecodedIdToken;
};

export async function requireInfluencer(request: Request): Promise<VerifiedInfluencer> {
  const token = getBearerToken(request);

  if (!token) {
    throw new AdminApiError(401, "missing_auth_token", "Sign in before using the workspace API.");
  }

  const { auth } = getFirebaseAdminClients();
  let decoded: DecodedIdToken;

  try {
    decoded = await auth.verifyIdToken(token, true);
  } catch {
    throw new AdminApiError(401, "invalid_auth_token", "Your session could not be verified.");
  }

  if (decoded.role !== "influencer") {
    throw new AdminApiError(403, "influencer_required", "This endpoint requires influencer workspace access.");
  }

  if (typeof decoded.workspaceId !== "string" || !decoded.workspaceId.trim()) {
    throw new AdminApiError(
      403,
      "workspace_claim_required",
      "This influencer account exists, but a workspace has not been assigned yet."
    );
  }

  return {
    uid: decoded.uid,
    email: typeof decoded.email === "string" ? decoded.email : undefined,
    workspaceId: decoded.workspaceId,
    token: decoded
  };
}
