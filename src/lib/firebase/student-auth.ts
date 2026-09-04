import type { DecodedIdToken } from "firebase-admin/auth";
import { getBearerToken } from "@/lib/firebase/admin-auth";
import { getFirebaseAdminClients } from "@/lib/firebase/admin";
import { AdminApiError } from "@/lib/firebase/admin-errors";

export type VerifiedStudent = {
  uid: string;
  email?: string;
  workspaceId: string;
  studentId: string;
  tierId: string | null;
  token: DecodedIdToken;
};

export async function requireStudent(request: Request): Promise<VerifiedStudent> {
  const token = getBearerToken(request);

  if (!token) {
    throw new AdminApiError(401, "missing_auth_token", "Sign in before using the student course API.");
  }

  const { auth } = getFirebaseAdminClients();
  let decoded: DecodedIdToken;

  try {
    decoded = await auth.verifyIdToken(token, true);
  } catch {
    throw new AdminApiError(401, "invalid_auth_token", "Your student session could not be verified.");
  }

  if (decoded.role !== "student") {
    throw new AdminApiError(403, "student_required", "This endpoint requires student app access.");
  }

  if (typeof decoded.workspaceId !== "string" || !decoded.workspaceId.trim()) {
    throw new AdminApiError(
      403,
      "workspace_claim_required",
      "This student account exists, but no TradeHub workspace has been assigned yet."
    );
  }

  return {
    uid: decoded.uid,
    email: typeof decoded.email === "string" ? decoded.email : undefined,
    workspaceId: decoded.workspaceId,
    studentId:
      typeof decoded.studentId === "string" && decoded.studentId.trim()
        ? decoded.studentId
        : decoded.uid,
    tierId:
      typeof decoded.tierId === "string" && decoded.tierId.trim()
        ? decoded.tierId
        : null,
    token: decoded
  };
}
