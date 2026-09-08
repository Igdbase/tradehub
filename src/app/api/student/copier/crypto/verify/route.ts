import { apiError, apiJson } from "@/lib/admin/admin-api";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import { requireStudent } from "@/lib/firebase/student-auth";
import { verifyLegacyTradeCopierCheckout } from "@/lib/student-copier/student-copier-billing";
import { getStudentCopierOverview } from "@/lib/student-copier/student-copier-dto";
import type { StudentCopierMutationResponse } from "@/types/student-copier";

function parseReference(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference")?.trim() ?? "";

  if (!reference || reference.length > 160) {
    throw new AdminApiError(400, "invalid_reference", "A valid Crypto Copier checkout reference is required.");
  }

  return reference;
}

export async function GET(request: Request) {
  try {
    const actor = await requireStudent(request);
    const result = await verifyLegacyTradeCopierCheckout(actor, parseReference(request), "crypto_autocopy");
    const payload: StudentCopierMutationResponse = {
      ok: true,
      message: result.message || (result.status === "verified"
        ? "Trade Copier payment verified. Crypto Setup and Forex Setup are now available."
        : result.status === "pending"
          ? "Trade Copier payment is still pending."
          : "Trade Copier payment could not be verified."),
      overview: await getStudentCopierOverview(actor)
    };

    return apiJson(payload);
  } catch (error) {
    return apiError(error);
  }
}
