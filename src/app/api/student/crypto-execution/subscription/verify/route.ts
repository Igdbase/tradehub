import { apiError, apiJson } from "@/lib/admin/admin-api";
import { getStudentCryptoExecutionOverview } from "@/lib/crypto-execution/crypto-execution-repository";
import { verifyStudentCryptoAutoCopyCheckout } from "@/lib/crypto-execution/crypto-autocopy-subscription-repository";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import { requireStudent } from "@/lib/firebase/student-auth";
import type { StudentCryptoAutoCopyVerifyResponse } from "@/types/crypto-execution";

function parseReference(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference")?.trim() ?? "";

  if (!reference || reference.length > 160) {
    throw new AdminApiError(400, "invalid_reference", "A valid Crypto AutoCopy Paystack reference is required.");
  }

  return reference;
}

export async function GET(request: Request) {
  try {
    const actor = await requireStudent(request);
    const reference = parseReference(request);
    const result = await verifyStudentCryptoAutoCopyCheckout(actor, reference);
    const overview = await getStudentCryptoExecutionOverview(actor);
    const response: StudentCryptoAutoCopyVerifyResponse = {
      source: overview.source,
      sourceLabel: overview.sourceLabel,
      sourceMessage: overview.sourceMessage,
      warnings: overview.warnings,
      ok: true,
      status: result.status,
      message: result.message,
      overview
    };

    return apiJson(response);
  } catch (error) {
    return apiError(error);
  }
}
